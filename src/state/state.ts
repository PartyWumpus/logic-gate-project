// THANK https://redux.js.org/usage/usage-with-typescript
// THANK https://redux.js.org/introduction/getting-started
import { configureStore, combineSlices } from "@reduxjs/toolkit";

import { componentsSlice } from "./components";
import { settingsSlice } from "./settings";

const reducer = combineSlices(componentsSlice, settingsSlice);

export const store = configureStore({
  reducer: reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// @ts-ignore
window.store = store;
