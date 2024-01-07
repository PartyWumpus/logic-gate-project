import { Component } from './Component'
import { ComponentView } from './ComponentView'
import { createDraft } from "immer"
import { useSettings } from './SettingsContext'

import { useState, useEffect } from 'react'
import intersect from 'fast_array_intersect'

function findSimplifiedBoolean(truthTable: boolean[]) {
  // special cases for all true...
  if (truthTable.every(x => x == true)) { return "1" }
  // ... and all false
  if (truthTable.every(x => x == false)) { return "0" }
  let visited = new Array(truthTable.length).fill(false);
  let logLength = Math.log2(truthTable.length)

  // iterate over all combinations (A,B,C,AB,AC,BC,ABC)
  // this is called a PowerSet.
  let allChecks = generateOptions(logLength)

  // generate all the negated versions (A,B,!A,!B,AB,!AB,A!B,!A!B)
  // i do not know if this has a name
  allChecks = allChecks.flatMap(addNegatedOptions)

  // dict of check values to indexes
  let checksDict: Record<number, number[]> = {}
  for (let check = -logLength; check <= logLength;check++) {
      let arr = []
      for (let index=0;index<truthTable.length;index++) {
          if (((index%(2**Math.abs(check)) >= (2**Math.abs(check))/2)) == (check > 0)) {
            arr.push(index)
          }
      }
      checksDict[check] = arr
  }
  
  let result = []
  for (let checks of allChecks) {
    let valid = true;
    let newVisits = [];
    for (let index of intersect(checks.map(x => checksDict[x]))) {
      if (truthTable[index] == false) {
        valid = false;
        break;
      }
      newVisits.push(index);
    }
    if (valid == true) {
      result.push(checks)
      for (let visit of newVisits) {
        visited[visit] = true
      }
    }
    if (visited.every((value, index) => truthTable[index] == value)) {
      return result
    }
  }
  throw new Error("finding solution somehow failed, this should be impossible to reach :(")
}


function generateOptions(count: number) {
  let allChecks: number[][] = []

  for (let option = 1; option <= count; option++) {
    for (let checkList of [...allChecks]) { // [...arr] makes a copy of arr so the loop does not go forever
      allChecks.push([...checkList, option])
    }
    allChecks.push([option])
  }
  allChecks.sort((a,b) => a.length - b.length)
  return allChecks
}

// turns [1,2] into [[1,2],[-1,2],[1,-2],[-1,-2]]
function addNegatedOptions(arr: number[]) {
  let result: number[][] = [[]]
  for (let val of arr) {
    result = [...result.map(x => [...x,val]),...result.map(x => [...x,-val])]
  }
  return result
}

function iterateBinaryOptions(length: number, grays: boolean = false) {
  let result = []
  if (grays == false) {
    for (let i = 0; i < 2**length; i++) {
      result.push(i
                  .toString(2) // convert it to binary and a string
                  .padStart(length, '0') // pad it to the correct length
                  .split("") // turn it into a list of "0"s and "1"s (still strings)
                  .map((x) => Boolean(Number(x))) // then convert those strings to numbers, then to booleans
                 ) // string -> number -> boolean is needed because string -> boolean is always true
  }
} else {
  result = [[false],[true]]
  let newArray = []
  for (let i = 0; i < length-1; i += 1) {
    // new array is the old array + the old array reversed
    // then add a zero before each value in the forwards array
    // and add a one before each value in the backwards array
    newArray = result.map(x => [false,...x]).concat(result.reverse().map(x => [true,...x]))
    result = newArray
  }
}
return result
}

function BooleanExpression({component}: {component: Component}) {
  const [truthTables, setTruthTables] = useState<boolean[][] | null>(null);
  const [simplifiedBooleanExpressions, setExpressions] = useState<string[] | null>(null);

  // expression is an array like            [1,    2,     -3]
  // this array means the boolean expression A and B and NOT C
  // which can be written as ABC̅
  function parseTerm(expression: number[]) {
    let result = [];
    for (let val of expression) {
      let name = component.inputNames.at(-Math.abs(val))
      if (val < 0) {
        name = "(NOT " + name + ")"
      }
      result.push(name)
    }
    return "("+result.join(' AND ')+")"
  }

  function parseShortTerm(expression: number[]) {
    let result = "";
    for (let val of expression) {
      result += component.inputNames.at(-Math.abs(val))
      if (val < 0) {
        result += "\u0305" // thanks https://www.compart.com/en/unicode/U+0305
      }
    }

    return result
  }

  function parseExpression(expression: number[][] | '1' | '0', short: boolean) {
    if (typeof(expression) === 'string') { return expression };
    if (short) { return expression.map(parseShortTerm).join('+') }
    else { return expression.map(parseTerm).join(' OR ') }
  }

  useEffect(() => { 
    let newTruthTables = []
    for (let outputNum = 0; outputNum < component.numOutputs; outputNum++) {
      let outputTable = []
      for (let option of iterateBinaryOptions(component.numInputs)) {
        outputTable.push(createDraft(component).resolve(option, outputNum)!)
      }
      newTruthTables.push(outputTable)
    }
    setTruthTables(newTruthTables)
  }, [])

  useEffect(() => {
    if (truthTables === null) {return}

    let shortNames = component.inputNames.every(x => x.length == 1)
    let results = truthTables.map(findSimplifiedBoolean)

    if (shortNames) {
      setExpressions(results.map(x =>parseExpression(x, true)))
    } else {
      // todo
    }
  }, [truthTables])

  return <p>{simplifiedBooleanExpressions && simplifiedBooleanExpressions.join(", ")}</p>
}

export function ComponentTable({component}: {component: Component}) {
  const settings = useSettings()

  const tempStyle = {margin:'auto'}
  
  return (
  <table style={tempStyle}>
    <thead>
      <tr>
        {component.inputNames.map((name, i) =>  <th key={i}>{name}</th>)}
        {component.outputNames.map((name, i) => <th key={i}>{name}</th>)}
      </tr>
    </thead>
    <tbody>
    {iterateBinaryOptions(component.numInputs, settings.graysCode).map((inputs, i) =>
      <tr key={i}>
        {inputs.map((input, j) => <td key={j}>{String(Number(input))}</td>)}
        {[...Array(component.numOutputs)].map((_, j) => 
        <td key={j}>{String(Number(createDraft(component).resolve(inputs, j)))}</td>)}
      </tr>
    )}
    </tbody>
  </table>)
}

export function ComponentMetadata({component}: {component: Component}) {
  return (
  <div className="component-metadata">
    <p>{component.name}</p>
    {(component.stateful || component.numInputs === 0 || component.numOutputs === 0) || <>
      <BooleanExpression component={component} />
      <ComponentTable component={component} />
      </>}
    {('internalComponents' in component) && <ComponentView components={component.internalComponents} SetComponents={() => {}}/>}
  </div>)
}