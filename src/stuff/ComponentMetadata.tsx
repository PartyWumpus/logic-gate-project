import { Component, LogicGate, NestedComponent } from "./Component";
import { DraggableComponent, ComponentConnections } from "./ComponentView";
import { createDraft } from "immer";
import { setSetting } from "../state/settings";
import { SettingsButton } from "./Settings";

import classNames from "classnames";
import { useState, useEffect } from "react";

import { useAppSelector, useAppDispatch } from "../state/hooks";
import { remove, setSaveName } from "../state/components";

type BooleanInput = number;
type BooleanCombination = BooleanInput[];


function findSimplifiedBoolean(truthTable: boolean[]) {
  // special cases for all true...
  if (truthTable.every((x) => x == true)) {
    return "1";
  }
  // ... and all false
  if (truthTable.every((x) => x == false)) {
    return "0";
  }

  // set of indexes that are true
  const toVisit = new Set(truthTable.map((val, index) => {if (val === true) {return index}}))
  toVisit.delete(undefined)
  const numOfInputs = Math.log2(truthTable.length);

  // iterate over all combinations (A,B,C,AB,AC,BC,ABC)
  // this is called a Power Set.
  let allCombinations = generateOptions(numOfInputs);

  // generate all the negated versions (A,B,!A,!B,AB,!AB,A!B,!A!B)
  allCombinations = allCombinations.flatMap(addNegatedOptions);

  // dict of input values to indexes
  let inputDict: Record<BooleanInput, Set<number>> = {};
  for (let input = -numOfInputs; input <= numOfInputs; input++) {
    let set: Set<number> = new Set();
    for (let index = 0; index < truthTable.length; index++) {
      if ((index % (2 ** Math.abs(input)) >= (2 ** Math.abs(input)) / 2) == input > 0) {
        set.add(index);
      }
    }
    inputDict[input] = set;
  }

  let result = [];
  for (let combination of allCombinations) {
    let valid = true;
    const arr_of_sets = combination.map((x) => inputDict[x])
    // @ts-expect-error, set intersection is a new part of the js spec so it thinks it doesn't exist
    const intersection = arr_of_sets.reduce((a, b) => a.intersection(b))
    for (let index of intersection) {
      if (truthTable[index] == false) {
        valid = false;
        break;
      }
    }

    if (valid == true) {
      result.push(combination);
      for (let visit of intersection) {
        toVisit.delete(visit);
      }
    }
    if (toVisit.size === 0) {
      return result;
    }
  }
  return result
}

function generateOptions(count: number) {
  let result: BooleanCombination[] = [[]];

  for (let option = 1; option <= count; option++) {
    const len = result.length; // the length must be found before the list is mutated so the loop stops at the original end of the list
    for (let i = 0; i < len; i++) {
      result.push(result[i].concat([option]));
    }
  }
  result.sort((a, b) => a.length - b.length);
  return result.slice(1);
}

function addNegatedOptions(arr: BooleanCombination) {
  let result: BooleanCombination[] = [[]];
  for (let val of arr) {
    result = [...result.map((x) => [...x, val]), ...result.map((x) => [...x, -val])];
  }
  return result;
}

function iterateBinaryOptions(length: number, grays: boolean = false) {
  let result = [];
  if (grays == false) {
    for (let i = 0; i < 2 ** length; i++) {
      result.push(
        i
          .toString(2) // convert it to binary and a string
          .padStart(length, "0") // pad it to the correct length
          .split("") // turn it into a list of "0"s and "1"s (still strings)
          .map((x) => Boolean(Number(x))), // then convert those strings to numbers, then to booleans
      ); // string -> number -> boolean is needed because string -> boolean is always true
    }
  } else {
    result = [[false], [true]];
    let newArray = [];
    for (let i = 0; i < length - 1; i += 1) {
      // new array is the old array + the old array reversed
      // then add a zero before each value in the forwards array
      // and add a one before each value in the backwards array
      newArray = [
        ...result.map((x) => [false, ...x]),
        ...result.reverse().map((x) => [true, ...x]),
      ];
      result = newArray;
    }
  }
  return result;
}

function BooleanExpression({ component }: { component: Component }) {
  const [simplifiedBooleanExpressions, setExpressions] = useState<string[] | null>(null);

  // expression is an array like            [1,    2,     -3]
  // this array means the boolean expression A and B and (NOT C)
  // which can be written as ABC̅
  function parseOneTerm(expression: BooleanCombination) {
    let result = "";
    for (let val of expression) {
      result += component.inputNames.at(-Math.abs(val));
      if (val < 0) {
        result += "\u0305"; // thanks https://www.compart.com/en/unicode/U+0305
      }
    }

    return result;
  }

  function parseExpression(expression: BooleanCombination[] | "1" | "0") {
    if (typeof expression === "string") {
      return expression;
    }
    return expression.map(parseOneTerm).join("+");
  }

  useEffect(() => {
    let truthTables = [];
    for (let outputNum = 0; outputNum < component.numOutputs; outputNum++) {
      let outputTable = [];
      for (let option of iterateBinaryOptions(component.numInputs, false)) {
        outputTable.push(createDraft(component).resolve(option, outputNum)!);
      }
      truthTables.push(outputTable);
    }

    let results = truthTables.map(findSimplifiedBoolean);
    setExpressions(results.map(parseExpression));
  }, [component.id]);

  return <p>{simplifiedBooleanExpressions && simplifiedBooleanExpressions.join(", ")}</p>;
}

export function ComponentTable({ component }: { component: Component }) {
  const graysCode = useAppSelector((state) => state.settings.graysCode);

  const tempStyle = { margin: "auto" };

  return (
    <table style={tempStyle}>
      <thead>
        <tr>
          {component.inputNames.map((name, i) => (
            <th key={i}>{name}</th>
          ))}
          {component.outputNames.map((name, i) => (
            <th key={i}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {iterateBinaryOptions(component.numInputs, graysCode).map((inputs, i) => (
          <tr key={i}>
            {inputs.map((input, j) => (
              <td key={j}>{Number(input)}</td>
            ))}
            {[...Array(component.numOutputs)].map((_, j) => (
              <td key={j}>{Number(createDraft(component).resolve(inputs, j))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ComponentMetadata() {
  const component = useAppSelector((state) =>
    state.components.components.get(state.components.selectedComponent!),
  );
  const dispatch = useAppDispatch();
  if (component === null || component === undefined) {
    return (
      <div className="component-metadata">
        <SettingsButton />
        <hr />
        <p>Click on a button on the menu on the left to create a new component.</p>
        <p>Click on the input and output boxes to start making a connection between components.</p>
        <p>You can save and load systems using the 'Save current system' button.</p>
        <p>Saved systems can be loaded in as nested components.</p>
        <p>Right click on a component to view more information about them.</p>
      </div>
    );
  }

  const imgClass = classNames(["component-metadata-image", component.cssClasses]);

  return (
    <div className="component-metadata">
      <SettingsButton />
      <hr />
      {component instanceof NestedComponent ? (
        <input
          value={component.name}
          onChange={(e) => dispatch(setSaveName([component.saveID, e.target.value]))}
          type="text"
        />
      ) : (
        <p>{component.name}</p>
      )}
      <img className={imgClass}></img>
      {component.stateful || component.numInputs === 0 || component.numOutputs === 0 || (
        <>
          <BooleanExpression component={component} />
          <ComponentTable component={component} />
        </>
      )}
      <button id={component.id} onClick={() => dispatch(remove(component.id))}>
        Delete
      </button>
    </div>
  );
}
