import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Settings {
  graysCode: boolean;
  theme: "dark" | "light";
  debugMode: boolean;
  invertColors: boolean;
}

const initialState: Settings = {
  graysCode: false,
  theme: "dark",
  debugMode: false,
  invertColors: false,
};

function loadSettings() {
  let settings = { ...initialState }; // make a copy of initial state

  try {
    const storedSettings = localStorage.getItem("settings");
    if (storedSettings !== null) {
      Object.assign(settings, JSON.parse(storedSettings)); // overwrite any default settings with stored settings
    }
  } catch (err) {
    console.error(err);
  }

  return settings;
}

export type SetterPayloads = { [T in keyof Settings]: [T, Settings[T]] };

export const settingsSlice = createSlice({
  name: "settings",
  initialState: loadSettings(),
  reducers: {
    setSetting: (state: Settings, action: PayloadAction<SetterPayloads[keyof SetterPayloads]>) => {
      // @ts-expect-error, this is definitely valid but the type checker doesn't believe me
      state[action.payload[0]] = action.payload[1];
      localStorage.setItem("settings", JSON.stringify(state));
    },
  },
});

export const { setSetting } = settingsSlice.actions;
