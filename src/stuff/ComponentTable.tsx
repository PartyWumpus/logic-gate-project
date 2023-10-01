import { Component } from './Component'
import { createDraft } from "immer"

export function ComponentTable({component}: {component: Component}) {
  function iterateBinaryOptions(length: number) {
    let result = []
    for (let i = 0; i < 2**length; i++) {
      result.push(i
                  .toString(2) // convert it to binary and a string
                  .padStart(length, '0') // pad it to the correct length
                  .split("") // turn it into a list of "0"s and "1"s (still strings)
                  .map((x) => Boolean(Number(x))) // then convert those strings to numbers, then to booleans
                 ) // string -> number -> boolean is needed because string -> boolean is always true
    }
    return result
  }

  function iterateAlphabet(length: number) {
    let result = []
    for (let i = 0; i < length; i++) {
      result.push((i+10).toString(36))
    }
    return result
  }

  const tempStyle = {margin:'auto'}
  
  return (
  <table style={tempStyle}>
    <thead>
      <tr>
        {iterateAlphabet(component.numInputs).map((letter) => <th key={letter}>{letter}</th>)}
        {[...Array(component.numOutputs)].map((_, i) => <th key={i}>Q<sub>{i+1}</sub></th>)}
      </tr>
    </thead>
    <tbody>
    {iterateBinaryOptions(component.numInputs).map((inputs, i) =>
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

ComponentTable.whyDidYouRender = {
  logOnDifferentValues: true,
}