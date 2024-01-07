import { produce } from "immer"
import { useState } from 'react'

import { SetStateType } from './util'
import { ComponentList, Component } from './Component'
import { LogicGate, Input, Output, SR_Latch, Nested_Component, D_Latch, Test } from './Component'

export function ComponentStore({components, SetComponents}: {components:ComponentList, SetComponents:SetStateType<ComponentList>}) {
  const [save, SetSave] = useState<string[]>([])
  
  function add_component(newComponent: Component) {
    const nextState = produce(components, draft => {
      draft[newComponent.id] = newComponent
      Component.resolve_everything_from_draft(draft)
    })
    SetComponents(nextState)
  }

  function resolve_everything() {
    const nextState = produce(components, draft => {Component.resolve_everything_from_draft(draft)})
    SetComponents(nextState)
  }
  
  return (
  <div className="store">
  <button onClick={resolve_everything}>THE GO BUTTON</button>
  <button onClick={() => console.log(components)}>THE DEBUG BUTTON</button>
  <div className="defaultComponents">
    <button onClick={() => add_component(new LogicGate("AND", 2))}>AND Gate</button>
    <button onClick={() => add_component(new LogicGate("AND", 4))}>4 AND Gate</button>
    <button onClick={() => add_component(new LogicGate("OR", 2))}>OR Gate</button>
    <button onClick={() => add_component(new LogicGate("XOR", 2))}>XOR Gate</button>
    <button onClick={() => add_component(new LogicGate("NAND", 2))}>NAND Gate</button>
    <button onClick={() => add_component(new LogicGate("NOR", 2))}>NOR Gate</button>
    <button onClick={() => add_component(new LogicGate("XNOR", 2))}>XNOR Gate</button>
    <button onClick={() => add_component(new LogicGate("NOT", 1))}>NOT Gate</button>
    <button onClick={() => add_component(new Input())}>Input</button>
    <button onClick={() => add_component(new Output())}>Output</button>
    <button onClick={() => add_component(new SR_Latch())}>SR Latch</button>
    <button onClick={() => add_component(new D_Latch())}>D Latch</button>
    <button onClick={() => add_component(new Test())}>TEST</button>
  </div>
  <div>
    <button onClick={() => {const x = Component.saveToJSON(components);console.log(x);SetSave([...save, x])}}>save the state</button>
    <button onClick={() => SetComponents({})}>delete the state</button>
    {save.map((state,i) => <button key={i} onClick={() => SetComponents(Component.loadFromJSON(state))}>load state {i}</button>)}
    {save.map((state,i) => <button key={i} onClick={() => add_component(new Nested_Component(state))}>nested component {i}</button>)}
  </div>
</div>
  )
}