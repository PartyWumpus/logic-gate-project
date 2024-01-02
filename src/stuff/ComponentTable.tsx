import { Component } from './Component'
import { createDraft } from "immer"
import { useSettings } from './SettingsContext'

import { useState, useEffect } from 'react'

function findSimplifiedBoolean(truthTable: boolean[]) {
  // special cases for all true...
  if (truthTable.every(x => x == true)) { return "1" }
  // ... and all false
  if (truthTable.every(x => x == false)) { return "0" }
  let visited = new Array(truthTable.length).fill(false);

  // iterate over all combinations (A,B,C,AB,AC,BC,ABC)
  // this is called a PowerSet.
  let allChecks = generateOptions(Math.log2(truthTable.length))

  // generate all the negated versions (A,B,!A,!B,AB,!AB,A!B,!A!B)
  // i do not know if this has a name
  allChecks = allChecks.flatMap(addNegatedOptions)

  let result = []
  for (let checks of allChecks) {
    let valid = true;
    let newVisits = [];
    nextCheck: for (let [index, value] of truthTable.entries()) {
      for (let check of checks.values()) {
        if (((index%(2**Math.abs(check)) >= (2**Math.abs(check))/2)) == (check < 0)) {
          continue nextCheck // this number does not match one of the checks, so skip it
        }
      }
      if (value == false) {
        valid = false;
        break nextCheck;
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
  console.log("finding solution somehow failed :(")
  throw new Error()
}


function generateOptions(length: number) {
  let options = [...Array(length).keys()].map(e => e += 1)
  let allChecks: number[][] = []

  for (let option of options) {
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


export function ComponentTable({component}: {component: Component}) {
  // if it would not make sense to make a truth table or calculate the boolean expression, exit early
  if (component.stateful || component.numInputs === 0 || component.numOutputs === 0) {return null}

  const settings = useSettings()
  const [truthTables, setTruthTables] = useState<boolean[][] | null>(null);
  const [simplifiedBooleanExpressions, setExpressions] = useState<string[] | null>(null);

  // expression is an array like            [1,    2,     -3]
  // this array means the boolean expression A and B and NOT C
  // which can be written as ABC̅
  function parseTerm(expression: number[] | '1' | '0') {
    if (typeof(expression) === 'string') { return expression };
    let result = "";
    for (let val of expression) {
      let letter = component.inputNames[Math.abs(val) - 1]
      if (val < 0) {
        // thanks https://www.compart.com/en/unicode/U+0305
        // the first character is the dotted circle character, as a placeholder
        // the second one is the overline combining character we want
        letter += "◌̅ "[1] 
      }
      result += letter
    }
    return result
  }

  function parseExpression(expression: (number[] | '1' | '0')[]) {
    return expression.map(parseTerm).join('+')
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
      console.log(results.map(parseExpression).join(", "))
      setExpressions(results.map(parseExpression))
    } else {
      // todo
    }
  }, [truthTables])

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
</table>
  )
}