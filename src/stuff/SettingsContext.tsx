// thanks https://react.dev/learn/scaling-up-with-reducer-and-context
import React, { createContext, useContext, useReducer } from 'react';
import { produce } from 'immer'

type settings = { [index: string]: any}

type action = {type: "set", key: string, data: any}

const SettingsContext = createContext<settings>(null);

const SettingsDispatchContext = createContext<React.Dispatch<action>>(null);

export function SettingsProvider({ children }: {children: any}) {
  const [settings, dispatch] = useReducer(
    settingsReducer,
    initialSettings
  );

  return (
    <SettingsContext.Provider value={settings}>
      <SettingsDispatchContext.Provider value={dispatch}>
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useSettingsDispatch() {
  return useContext(SettingsDispatchContext);
}

function settingsReducer(settings: settings, action:action) {
  switch (action.type) {
    case 'set': {
      return produce(settings, draft => draft[action.key] = action.data)
    }
    default: {
      throw Error('Unknown action: ' + action.type);
    }
  }
  // TODO: save to cookies
}

const initialSettings = {
  graysCode: false
};
