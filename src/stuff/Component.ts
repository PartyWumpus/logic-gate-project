import { immerable, Draft } from "immer";

import type { Opaque } from "type-fest";

import type { SaveID } from "../state/components";

export type ComponentID = Opaque<string, "component">;

export type ComponentList = Map<ComponentID, Component>;

interface Connection {
  id: ComponentID;
  index: number;
}

interface Coordinates {
  x: number;
  y: number;
}

type PlainComponent = { [Key in keyof Component]: Component[Key] };

function generateNewID() {
  return crypto.randomUUID() as ComponentID;
}

/** TODO: find a good description for this base class */
export abstract class Component {
  [immerable] = true; // this makes it so immer copies the class fully when making a draft of the state

  /** A unique id used for referencing this component from other components */
  readonly id: ComponentID;
  /** The number of inputs it has */
  readonly numInputs: number;
  /** The number of outputs */
  readonly numOutputs: number;
  /** Does this component have any sort of internal state */
  stateful: boolean;
  /** A display name for the component */
  readonly name: string;
  /** An array of the output values, also used as a cache. Length = `numOutputs` */
  values: (boolean | null)[];
  /** An array of the components connected to the inputs of this component. Length = `numInputs` */
  inputs: (Connection | null)[];
  /** The coordinates of the component. They are changed when the component stops being dragged. Used so position can be kept after (de)serialization */
  coords: Coordinates | null;
  inputNames: string[];
  outputNames: string[];
  cssClasses: string[];
  constructor(numInputs: number, numOutputs: number, name: string) {
    // static/readonly
    this.id = generateNewID();
    this.numInputs = numInputs;
    this.numOutputs = numOutputs;
    this.stateful = false;
    this.name = name;

    // will change
    this.values = new Array(numOutputs).fill(null);
    this.inputs = new Array(numInputs).fill(null);
    this.coords = null;
    this.cssClasses = ["component-img", this.constructor.name];

    // default input names are the letters of the alphabet
    let names = [];
    for (let i = 0; i < numInputs; i++) {
      names.push((i + 10).toString(36).toUpperCase());
    }
    this.inputNames = names;

    // default output names are Q0, Q1, etc
    if (this.numOutputs == 1) {
      this.outputNames = ["Q"];
    } else {
      names = [];
      for (let i = 0; i < numOutputs; i++) {
        names.push("Q" + i);
      }
      this.outputNames = names;
    }
  }

  // abstract means that this function must be implemented by any child classes
  /** Calculates an output value for this component, remember to implement me! */
  abstract resolve(inputs: (boolean | null)[], outputIndex: number): boolean | null;

  /** Run when the component is clicked on, no default implementation */
  interact() {
    return false;
  }

  /** Runs when the component stops moving to update it's internal coordinates */
  setCoords(x: number, y: number) {
    this.coords = { x: x, y: y };
  }

  /** Handles caching values for outputs */
  getValue(components: ComponentList, outputIndex: number): boolean | null {
    if (this.inputs.some((input) => input == null)) {
      return null;
    } // if any of my inputs is null, return null
    if (this.values[outputIndex] != null) {
      return this.values[outputIndex];
    } // if the value has already been calculated, return that
    let inputs: (boolean | null)[] = [];
    for (const i in this.inputs) {
      const connection = this.inputs[i]!;
      inputs[i] = components.get(connection.id)!.getValue(components, connection.index);
    }
    const result = this.resolve(inputs, outputIndex); // otherwise calculate the value, then store and return that
    this.values[outputIndex] = result;
    return result;
  }

  /** Connects an output of `value` to one of this component's inputs */
  input(id: ComponentID, inputIndex: number, outputIndex: number) {
    this.inputs[inputIndex] = { id: id, index: outputIndex };
  }

  static loadFromJSON(data: string) {
    const parsed = JSON.parse(data, component_reviver) as ComponentList;
    console.log("all goood", parsed);
    const result = new Map();

    const idMap: Record<ComponentID, ComponentID> = {}; // used to remap all the ids, to make sure ID collisions can never occur

    // copy into a new map with different IDs
    for (const [old_id, component] of parsed) {
      const new_id = (idMap[old_id] = generateNewID());
      // @ts-expect-error, overwriting the ID is illegal
      component.id = new_id;
      result.set(new_id, component);
    }

    // remap all connections to the new ids
    for (const [_, component] of result) {
      for (const connection of component.inputs) {
        if (connection !== null) {
          connection.id = idMap[connection.id];
        }
      }
    }

    return result;
  }

  static saveToJSON(components: ComponentList): string {
    return JSON.stringify(components, component_replacer);
  }

  /** Takes in a draft of the component list and calculates the state for everything in the list */
  static resolveEverything(state: Draft<ComponentList> | ComponentList) {
    // empty the caches
    for (const [id, _] of state) {
      const component = state.get(id)!;
      component.values.fill(null);
    }
    // iterate over all the components and resolve them to find what they should output
    // (the values are then automatically cached in the values property)
    for (const [id, _] of state) {
      const component = state.get(id)!;
      for (let i = 0; i < Math.max(component.numOutputs, 1); i++) {
        component.getValue(state as ComponentList, i);
      }
    }
  }
}

function component_replacer(key: any, value: any): any {
  if (value instanceof Map) {
    return {
      ___type: "ComponentList",
      __value: [...value],
    };
  } else if (value instanceof Component) {
    return {
      ___type: "Component",
      __component_type: value.constructor.name,
      __value: component_replacer(null, { ...value }),
    };
  } else {
    return value;
  }
}

function component_reviver(key: any, value: any): any {
  if (typeof value === "object" && value !== null) {
    if (value.___type === "ComponentList") {
      return new Map(value.__value);
    } else if (value.___type === "Component") {
      const component = new classes[value.__component_type]();
      console.log(value.__value);
      return Object.assign(component, component_reviver(null, value.__value));
    }
  }
  return value;
}

type GateType = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "XNOR" | "NOT";
export class LogicGate extends Component {
  flavor: GateType;
  constructor(type: GateType, numInputs: number) {
    super(numInputs, 1, type);
    this.flavor = type;
    this.cssClasses.push(this.flavor);
  }

  resolve(inputs: (boolean | null)[], outputIndex: number): boolean | null {
    let result = inputs[0];
    if (result == null) {
      return null;
    }

    for (let index = 1; index < this.numInputs; index++) {
      const value = inputs[index];
      if (value == null) {
        return null;
      }
      switch (this.flavor) {
        case "NAND":
        case "AND":
          result = result && value;
          break; // && is equivalent to bitwise AND
        case "NOR":
        case "OR":
          result = result || value;
          break; // || is equivalent to bitwise OR
        case "XNOR":
        case "XOR":
          result = result != value;
          break; // != is equivalent to bitwise XOR
      }
    }
    if (["NAND", "NOR", "XNOR", "NOT"].includes(this.flavor)) {
      // this inverts the output of the negating gates
      result = !result;
    }
    return result;
  }
}

export class Input extends Component {
  __state: boolean;
  constructor() {
    super(0, 1, "Input");
    this.__state = false;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    return this.__state;
  }

  interact() {
    this.__state = !this.__state;
    return true;
  }

  set state(value: boolean) {
    this.__state = value;
  }
}

export class Output extends Component {
  constructor() {
    super(1, 0, "Output");
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    return inputs[0];
  }
  interact() {
    return true;
  }
}

export class SRLatch extends Component {
  state: boolean | null;
  constructor() {
    super(2, 2, "SR Latch");
    this.stateful = true;
    this.inputNames = ["Set", "Reset"];
    this.outputNames = ["Q", "Q\u0305"];
    this.state = null;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    if (inputs[1] == true) {
      this.state = false;
    }
    if (inputs[0] == true) {
      this.state = true;
    }
    // if both are true then the state is set to true. this is the illegal state
    if (inputs[0] == true && inputs[1] == true) {
      return true;
    }

    if (this.state == null) {
      return null;
    }
    if (outputIndex == 0) {
      return this.state;
    }
    if (outputIndex == 1) {
      return !this.state;
    }
    return null; // shouldn't be reachable, just here so typescript shuts up
  }
}

export class DLatch extends Component {
  state: boolean | null;
  constructor() {
    super(2, 2, "D Latch");
    this.stateful = true;
    this.inputNames = ["Data", "Enable"];
    this.outputNames = ["Q", "Q\u0305"];
    this.state = null;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    // if enable is on, set the state to data
    if (inputs[1] == true) {
      this.state = inputs[0];
    }

    if (this.state == null) {
      return null;
    }
    if (outputIndex == 0) {
      return this.state;
    }
    if (outputIndex == 1) {
      return !this.state;
    }
    return null; // shouldn't be reachable
  }
}

export class NestedComponent extends Component {
  /** An internal set of components, may be a string if this has just been deserialized */
  internalComponents: ComponentList;
  /** A list of the internal IDs for each of the input components */
  inputIDs: ComponentID[];
  /** A list of the internal IDs for each of the output components */
  outputIDs: ComponentID[];
  saveID: SaveID;
  constructor(internalComponents: ComponentList | string, saveID: SaveID, name: string | null) {
    let inputIDs = [];
    let outputIDs = [];
    let stateful = false;
    // the deseralizer goes through this constructor with undefined values for all inputs
    // this part of the code is undeeded if being deserialized anyway, so just skip it
    if (typeof internalComponents !== "undefined") {
      if (typeof internalComponents === "string") {
        internalComponents = Component.loadFromJSON(internalComponents);
      }
      for (const [id, component] of internalComponents) {
        if (component.stateful == true) {
          stateful = true;
          console.log(stateful);
        }
        if (component instanceof Input) {
          inputIDs.push(id);
        }
        if (component instanceof Output) {
          outputIDs.push(id);
        }
      }
    }
    super(inputIDs.length, outputIDs.length, name ?? "Nested Component");
    // these have to be set after super() is run
    this.internalComponents = internalComponents;
    this.stateful = stateful;
    this.inputIDs = inputIDs;
    this.outputIDs = outputIDs;
    this.saveID = saveID;
  }

  resolve(inputs: (boolean | null)[], outputIndex: number) {
    // set the internal input values to the external input values
    for (const [index, id] of this.inputIDs.entries()) {
      const internalInput = this.internalComponents.get(id)! as Input;
      const externalResult = inputs[index];
      if (externalResult == null) {
        return null;
      }
      internalInput.state = externalResult;
    }

    Component.resolveEverything(this.internalComponents);
    return this.internalComponents
      .get(this.outputIDs[outputIndex])!
      .getValue(this.internalComponents, 0);
  }
}

/*export class Test extends Component {
  constructor() {
    super(2, 2, "Test");
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    if (outputIndex == 0) {
      return inputs[0]
    }
    if (outputIndex == 1) {
      return inputs[1]
    }
    return null
  }
}*/

export class SevenSegDisplay extends Component {
  /** The number that the seven seg display shows */
  value: number | null;
  constructor() {
    super(4, 0, "Denary Display");
    this.value = null;
    this.cssClasses.push("value-" + this.value);
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    if (inputs.every((x) => x == null)) {
      return null;
    }
    this.value = parseInt(
      inputs
        .reverse()
        .map((x) => Number(x))
        .join(""),
      2,
    );
    this.cssClasses[2] = "value-" + this.value;
    return null;
  }
}

const classes: Record<string, any> = {
  LogicGate: LogicGate,
  Input: Input,
  Output: Output,
  SRLatch: SRLatch,
  NestedComponent: NestedComponent,
  /*"Test":Test,*/ DLatch: DLatch,
  SevenSegDisplay: SevenSegDisplay,
};

// for testing
// @ts-ignore
window.components = classes;
