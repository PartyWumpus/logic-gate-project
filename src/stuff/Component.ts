import { immerable, Draft } from "immer"
import { DraggableEvent, DraggableData } from 'react-draggable'
import { plainToInstance } from "class-transformer"

import { coordinates } from './util'

export type ComponentList = Record<string, Component>

interface connection {
  id: string;
  index: number;
}

/** TODO: find a good description for this base class */
export abstract class Component {
  [immerable] = true // this makes it so immer copies the class fully when making a draft of the state
  
  /** A unique id used for referencing this component from other components */
  readonly id: string
  /** The name of the class this is a member of, used for deserialization */
  private __type: string
  /** The number of inputs it has */
  readonly numInputs: number 
  /** The number of outputs */
  readonly numOutputs: number
  /** Does this component have any sort of internal state */
  stateful: boolean
  /** A display name for the component. TODO: make this variable better or get rid of it or smth */
  readonly name: string
  /** An array of the output values, also used as a cache. Length = `numOutputs` */
  private __values: (boolean | null)[]
  /** An array of the components connected to the inputs of this component. Length = `numInputs` */
  private __inputs: (connection | null)[]
  /** The coordinates of the component. They are changed when the component stops being dragged. Used so position can be kept after (de)serialization */
  private __coords: coordinates | null
  inputNames: string[]
  outputNames: string[]
  constructor(numInputs: number, numOutputs: number, name: string) {
    // static/readonly
    this.id = crypto.randomUUID();
    this.__type = this.constructor.name; // thanks https://stackoverflow.com/a/36643177
    this.numInputs = numInputs;
    this.numOutputs = numOutputs;
    this.stateful = false;
    this.name = name;
    
    // will change
    this.__values = new Array(numOutputs).fill(null);
    this.__inputs = new Array(numInputs).fill(null);
    this.__coords = null

    // default input names are the letters of the alphabet
    let names = []
    for (let i = 0; i < numInputs; i++) {
      names.push((i+10).toString(36).toUpperCase())
    }
    this.inputNames = names

    // default output names are Q0, Q1, etc
    if (this.numOutputs == 1) {this.outputNames = ["Q"]} else {
      names = []
      for (let i = 0; i < numOutputs; i++) {
        names.push("Q" + i)
      }
      this.outputNames = names
    }
  }

  /** The coordinates of this component */
  get coords() {return this.__coords}
  /** An array of the components connected to the inputs of this component */
  get inputs() {return this.__inputs}
  /** An array of the output values */
  get values() {return this.__values}

  // abstract means that this function must be implemented by any child classes
  /** Calculates an output value for this component, remember to implement me! */
  abstract resolve(inputs: (boolean | null)[], outputIndex: number): boolean | null

  /** Run when the component is clicked on, no default implementation */
  interact() {return false}

  /** Runs when the component stops moving to update it's internal coordinates */
  onStop(e: DraggableEvent, data: DraggableData) {
    this.__coords = {x:data.x, y:data.y}
  }

  /** Handles caching values for outputs */
  getValue(components: ComponentList, outputIndex: number): boolean | null {
    if (this.inputs.some((input) => input == null)) { return null } // if any of my inputs is null, return null
    if (this.__values[outputIndex] != null) {return this.__values[outputIndex]} // if the value has already been calculated, return that
    let inputs: (boolean | null)[] = []
    for (const i in this.inputs) {
      const connection = this.inputs[i]!
      inputs[i] = components[connection.id].getValue(components, connection.index)
    }
    const result = this.resolve(inputs, outputIndex) // otherwise calculate the value, then store and return that
    this.__values[outputIndex] = result
    return result
  }

  //public render() {
  //  return <p>I am a: {this.type} with a {this.values}</p>
  //}

  /** Connects an output of `value` to one of this component's inputs */
  input(value: Component, inputIndex: number, outputIndex: number) {
    this.inputs[inputIndex] = {id:value.id, index: outputIndex}
  }

  static loadFromJSON(data: string | object) {
    let parsed: Record<string, Component>
    if (typeof data === 'string') {
      parsed = JSON.parse(data) as Record<string, Component>
    } else {
      parsed = data as Record<string, Component>
    }
    const result: ComponentList = {}
    for (const [key, component] of Object.entries(parsed)) {
      result[key] = plainToInstance(classes[component.__type], component)
    }
    return result
  }

  static saveToJSON(components: ComponentList): string {
    return JSON.stringify(components)
  }
  
  /** Takes in a draft of the component list and calculates the state for everything in the list */
  static resolve_everything_from_draft(state: Draft<ComponentList> | ComponentList) {
    // empty the caches
    for (const i in state) {
      const component = state[i]
      component.values.fill(null);
    }
    // iterate over all the components and resolve them to find what they should output 
    // (the values are then automatically cached in the values property)
    for (const i in state) {
      const component = state[i]
      for(let i = 0; i < Math.max(component.numOutputs,1); i++) {
        component.getValue(state as ComponentList, i)
      }
    }
  }
}

type GateType = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "XNOR" | "NOT"
export class LogicGate extends Component {
  flavor: GateType
  constructor(type: GateType, numInputs: number) {
    super(numInputs, 1, type)
    this.flavor = type
  }
  
  resolve(inputs: (boolean | null)[], outputIndex: number): boolean | null {
    let result = inputs[0]
    if (result == null) {return null}
    
    for (let index = 1; index < this.numInputs; index++) {
      const value = inputs[index]
      if (value == null) { return null }
      switch (this.flavor) {
        case "NAND":
        case "AND": result = result && value; break; // && is equivalent to bitwise AND
        case "NOR":
        case "OR": result = result || value; break; // || is equivalent to bitwise OR
        case "XNOR":
        case "XOR": result = result != value; break; // != is equivalent to bitwise XOR
      }
    }
    if (["NAND", "NOR", "XNOR", "NOT"].includes(this.flavor)) { // this inverts the output of the negating gates
      result = !(result)
    }
    return result
  }
}

export class Input extends Component {
  __state: boolean
  constructor() {
    super(0, 1, "Input")
    this.__state = false;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) { return this.__state }
  
  interact() {
    this.__state = !(this.__state)
    return true
  } 

  set state(value: boolean) {this.__state = value}
}

export class Output extends Component {
  constructor() {
    super(1, 0, "Output");
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) { return inputs[0] }
  interact() {return true}
}

export class SR_Latch extends Component {
  state: boolean | null
  constructor() {
    super(2, 2, "SR Latch");
    this.stateful = true;
    this.inputNames = ["Set","Reset"]
    this.state = null;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    if (inputs[1] == true) {this.state = false}
    if (inputs[0] == true) {this.state = true}
    // if both are true then the state is set to true. this is the illegal state
    if (inputs[0] == true && inputs[1] == true) {return true}
      
    if (this.state == null) {return null}
    if (outputIndex == 0) {return this.state}
    if (outputIndex == 1) {return !(this.state)}
    return null // shouldn't be reachable, just here so typescript shuts up
  }
}

export class D_Latch extends Component {
  state: boolean | null
  constructor() {
    super(2, 2, "D Latch");
    this.stateful = true;
    this.inputNames = ["Data","Enable"]
    this.state = null;
  }
  resolve(inputs: (boolean | null)[], outputIndex: number) {
    // if enable is on, set the state to data
    if (inputs[1] == true) {this.state = inputs[0]}
    
    if (this.state == null) {return null}
    if (outputIndex == 0) {return this.state}
    if (outputIndex == 1) {return !(this.state)}
    return null // shouldn't be reachable
  }
}

export class Nested_Component extends Component {
  /** An internal set of components, may be a string if this has just been deserialized */
  internalComponents: ComponentList | string
  /** A list of the internal IDs for each of the input components */
  inputIDs: string[]
  /** A list of the internal IDs for each of the output components */
  outputIDs: string[]
  constructor(internalComponents: ComponentList | string) {
    let inputIDs = []
    let outputIDs = []
    let stateful = false
    // the class-transformer library goes through this constructor with undefined values for all inputs
    // this part of the code is undeeded if being deserialized anyway, so just skip it
    if (typeof internalComponents !== 'undefined') { 
      if (typeof internalComponents === 'string') {internalComponents = Component.loadFromJSON(internalComponents)}
      for (const [id, component] of Object.entries(internalComponents)) {
        if (component.stateful == true) {stateful = true; console.log(stateful)}
        if (component instanceof Input) {inputIDs.push(id)}
        if (component instanceof Output) {outputIDs.push(id)}
      }
    }
    super(inputIDs.length, outputIDs.length, "TODO")
    // these have to be set after super() is run
    this.internalComponents = internalComponents
    this.stateful = stateful
    console.log(stateful)
    this.inputIDs = inputIDs
    this.outputIDs = outputIDs
  }

  resolve(inputs: (boolean | null)[], outputIndex: number) {
    // the type of internalComponents can be a string after deserialization
    if (typeof this.internalComponents === 'string') {this.internalComponents = Component.loadFromJSON(this.internalComponents)}
    // for some reason, the internal components list will sometimes get deserialized as 'plain' objects instead of Components or a string
    // i cannot figure out why, so this will just check to see if it has happened, and if it has, then fix it
    if (Object.values(this.internalComponents)[0] instanceof Component == false) {
      this.internalComponents = Component.loadFromJSON(this.internalComponents)
    }
    
    // set the internal input values to the external input values
    for (const [index, id] of this.inputIDs.entries()) {
      const internalInput = this.internalComponents[id] as Input
      const connection = this.inputs?.[index]!
      const externalResult = inputs[index]
      if (externalResult == null) {return null}
      internalInput.state = externalResult
    }
    Component.resolve_everything_from_draft(this.internalComponents)
    return this.internalComponents[this.outputIDs[outputIndex]].getValue(this.internalComponents, 0)
  }
}


export class Test extends Component {
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
}

const classes: Record<string, any> = {"LogicGate":LogicGate,"Input":Input,"Output":Output,"SR_Latch":SR_Latch,
                                      "Nested_Component":Nested_Component,"Test":Test, "D_Latch": D_Latch}