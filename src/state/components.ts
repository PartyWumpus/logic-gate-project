import { createSlice, PayloadAction, current, original, Draft } from "@reduxjs/toolkit";

import { ComponentList, Component, ComponentID, NestedComponent } from "../stuff/Component";

import type { Opaque } from "type-fest";

export type SaveID = Opaque<string, "test">;

interface Save {
  data: string;
  name: string | null;
}

interface State {
  componentsHistory: ComponentList[];
  componentsFuture: ComponentList[];
  components: ComponentList;

  selectedComponent: ComponentID | null;
  saves: Map<SaveID, Save>;

  componentKeys: ComponentID[]; // redundant info, to save time & effort
}

const initialState: State = {
  components: new Map(),
  selectedComponent: null,
  componentKeys: [],
  saves: new Map(),
  componentsHistory: [],
  componentsFuture: [],
};

function appendToUndoHistory(state: Draft<State>) {
  const previousState = original(state)!.components;
  state.componentsHistory.push(previousState);
  state.componentsFuture = []; // if the past is changed, the future no longer makes sense
}

export const componentsSlice = createSlice({
  name: "components",
  initialState,
  reducers: {
    // component list mutations

    add: (state, action: PayloadAction<Component>) => {
      appendToUndoHistory(state);
      state.componentKeys.push(action.payload.id);
      state.components.set(action.payload.id, action.payload);
      Component.resolveEverything(state.components);
    },

    remove: (state, action: PayloadAction<ComponentID>) => {
      appendToUndoHistory(state);
      state.componentKeys = state.componentKeys.filter((x) => x !== action.payload); // remove id from the array
      for (const [_, component] of state.components) {
        for (const [index, connection] of component.inputs.entries()) {
          if (connection?.id == action.payload) {
            component.inputs[index] = null;
          }
        }
      }
      state.components.delete(action.payload);
      Component.resolveEverything(state.components);
    },

    updateState: (state) => {
      Component.resolveEverything(state.components);
    },

    reset: (state) => {
      const saves = state.saves;
      Object.assign(state, initialState);
      state.saves = saves;
    },

    // history mutations

    undo: (state) => {
      const new_state = state.componentsHistory.pop();
      if (new_state === undefined) {
        // this function shouldn't be called if there isn't any history, but just failing silently is probably the best thing to do in that situation
        return;
      }
      state.componentsFuture.push(original(state)!.components);
      state.components = new_state;
      state.componentKeys = [...state.components.keys()];
    },

    redo: (state) => {
      const new_state = state.componentsFuture.pop();
      if (new_state === undefined) {
        // this function shouldn't be called if there isn't any future, but just failing silently is probably the best thing to do in that situation
        return;
      }
      state.componentsHistory.push(original(state)!.components);
      state.components = new_state;
      state.componentKeys = [...state.components.keys()];
    },

    // save mutations

    saveCurrentState: (state) => {
      state.saves.set(crypto.randomUUID() as SaveID, {
        data: Component.saveToJSON(state.components),
        name: null,
      });
    },

    loadSave: (state, action: PayloadAction<SaveID>) => {
      state.components = Component.loadFromJSON(state.saves.get(action.payload)!.data);
      state.componentKeys = [...state.components.keys()];
    },

    createNestedComponent: (state, action: PayloadAction<SaveID>) => {
      const save = state.saves.get(action.payload)!;
      const component = new NestedComponent(save.data, action.payload, save.name);
      state.componentKeys.push(component.id);
      state.components.set(component.id, component);
    },

    setSaveName: (state, action: PayloadAction<[id: SaveID, name: string]>) => {
      const [id, name] = action.payload;
      state.saves.get(id)!.name = name;
      for (const [_, component] of state.components) {
        if (component?.saveID === id) {
          component.name = name;
        }
      }
    },

    // selected component mutations

    selectComponent: (state, action: PayloadAction<ComponentID>) => {
      state.selectedComponent = action.payload;
    },

    // individual component mutations

    interact: (state, action: PayloadAction<ComponentID>) => {
      state.components.get(action.payload)?.interact();
      Component.resolveEverything(state.components);
    },

    changeCoords: (state, action: PayloadAction<[id: ComponentID, x: number, y: number]>) => {
      state.components.get(action.payload[0])?.setCoords(action.payload[1], action.payload[2]);
      Component.resolveEverything(state.components);
    },

    connect: (
      state,
      action: PayloadAction<
        [inputID: ComponentID, outputID: ComponentID, inputIndex: number, outputIndex: number]
      >,
    ) => {
      appendToUndoHistory(state);
      const [inputID, outputID, inputIndex, outputIndex] = action.payload;
      state.components.get(inputID)?.input(outputID, inputIndex, outputIndex);
      Component.resolveEverything(state.components);
    },
  },
});

export const {
  add,
  remove,
  updateState,
  reset,
  undo,
  redo,
  saveCurrentState,
  loadSave,
  createNestedComponent,
  selectComponent,
  interact,
  changeCoords,
  connect,
  setSaveName,
} = componentsSlice.actions;

export const {} = componentsSlice.actions;
