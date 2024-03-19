import { Fragment } from "react";

import { useAppSelector, useAppDispatch } from "../state/hooks";
import {
  add,
  updateState,
  reset,
  loadSave,
  createNestedComponent,
  saveCurrentState,
} from "../state/components";
import { store } from "../state/state";

import { LogicGate, Input, Output, SRLatch, DLatch, SevenSegDisplay } from "./Component";

export function ComponentStore() {
  const dispatch = useAppDispatch(); // dispatch function used for mutating the state
  const saves = useAppSelector((state) => state.components.saves);
  const debugMode = useAppSelector((state) => state.settings.debugMode);

  return (
    <div className="store">
      {debugMode && (
        <div className="store-debug">
          <button onClick={() => dispatch(updateState())}>force update</button>
          <button onClick={() => console.log(store.getState())}>log state</button>
          <hr />
        </div>
      )}

      <div className="store-components">
        <button onClick={() => dispatch(add(new LogicGate("AND", 2)))}>AND Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("AND", 4)))}>4 AND Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("OR", 2)))}>OR Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("XOR", 2)))}>XOR Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("NAND", 2)))}>NAND Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("NOR", 2)))}>NOR Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("XNOR", 2)))}>XNOR Gate</button>
        <button onClick={() => dispatch(add(new LogicGate("NOT", 1)))}>NOT Gate</button>
        <button onClick={() => dispatch(add(new Input()))}>Input</button>
        <button onClick={() => dispatch(add(new Output()))}>Output</button>
        <button onClick={() => dispatch(add(new SRLatch()))}>SR Latch</button>
        <button onClick={() => dispatch(add(new DLatch()))}>D Latch</button>
        <button onClick={() => dispatch(add(new SevenSegDisplay()))}>Seven Seg Display</button>
        <hr />
      </div>

      <div className="store-saves">
        <button onClick={() => dispatch(saveCurrentState())}>Save current system</button>
        <button onClick={() => dispatch(reset())}>Delete current system</button>
        <br />
        {[...saves.entries()].map(([id, { name }], index) => (
          <Fragment key={id}>
            <br />
            <button onClick={() => dispatch(loadSave(id))}>Load system {name ?? index}</button>
            <button onClick={() => dispatch(createNestedComponent(id))}>
              Create component {name ?? index}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
