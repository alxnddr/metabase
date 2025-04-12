# Redux Toolkit Migration Guide

This guide outlines the process for migrating from `redux-actions` to Redux Toolkit (RTK) in the Metabase codebase.

## Background

Metabase currently uses the `redux-actions` library for creating actions and reducers. This library is older and less maintained than Redux Toolkit, which is now the official, recommended way to build Redux applications.

The migration focuses on:
1. Replacing `handleActions` with `createReducer` from Redux Toolkit
2. Replacing `createAction` from redux-actions with `createAction` from Redux Toolkit
3. Maintaining backward compatibility during the transition period

## Migration Strategy

### 1. Utility Functions

A utility function `handleActionsToCreateReducer` has been added to make the migration smoother:

```typescript
// frontend/src/metabase/lib/redux/rtk-utils.ts
import { createReducer } from "@reduxjs/toolkit";
import type { AnyAction } from "redux";

export function handleActionsToCreateReducer<State>(
  handlers: Record<string, (state: State, action: AnyAction) => State>,
  initialState: State
) {
  return createReducer(initialState, (builder) => {
    Object.entries(handlers).forEach(([actionType, handler]) => {
      builder.addCase(actionType, handler);
    });
  });
}
```

### 2. Updating Imports and Exports

The `/frontend/src/metabase/lib/redux/utils.js` file has been updated to:
- Export `createReducer` from Redux Toolkit
- Export the new `handleActionsToCreateReducer` utility
- Mark the old exports as deprecated

```javascript
// frontend/src/metabase/lib/redux/utils.js
import { createAction as rtkCreateAction } from "@reduxjs/toolkit";
export { combineReducers, compose, createReducer } from "@reduxjs/toolkit";
export { handleActionsToCreateReducer } from "./rtk-utils";

// DEPRECATED: Use createReducer from @reduxjs/toolkit instead
export { handleActions } from "redux-actions";

// DEPRECATED: Use createAction from @reduxjs/toolkit instead
export { createAction } from "redux-actions";
```

### 3. Two Migration Approaches

#### Approach 1: Direct Replacement (Recommended for new code)

This approach replaces `handleActions` with `createReducer` and utilizes the immer-powered mutation syntax:

```javascript
// Before
const myReducer = handleActions(
  {
    [ACTION_TYPE]: (state, { payload }) => ({ ...state, value: payload }),
  },
  initialState
);

// After
const myReducer = createReducer(initialState, (builder) => {
  builder.addCase(ACTION_TYPE, (state, { payload }) => {
    state.value = payload;
  });
});
```

#### Approach 2: Using the Utility Function (For easier migration of existing code)

This approach uses the utility function to maintain the same structure while migrating:

```javascript
// Before
const myReducer = handleActions(
  {
    [ACTION_TYPE]: (state, { payload }) => ({ ...state, value: payload }),
  },
  initialState
);

// After
const myReducer = handleActionsToCreateReducer(
  {
    [ACTION_TYPE]: (state, { payload }) => ({ ...state, value: payload }),
  },
  initialState
);
```

### 4. Migrating Action Creators

Action creators should be migrated from redux-actions to Redux Toolkit:

```javascript
// Before
import { createAction } from "redux-actions";
export const myAction = createAction("MY_ACTION_TYPE");

// After
import { createAction } from "@reduxjs/toolkit";
export const myAction = createAction("MY_ACTION_TYPE");
```

## Examples

### Example 1: Basic Reducer with createReducer

```javascript
// Before
const counter = handleActions(
  {
    [INCREMENT]: (state) => state + 1,
    [DECREMENT]: (state) => state - 1,
  },
  0
);

// After
const counter = createReducer(0, (builder) => {
  builder
    .addCase(INCREMENT, (state) => state + 1)
    .addCase(DECREMENT, (state) => state - 1);
});
```

### Example 2: Object State with Immer

```javascript
// Before
const user = handleActions(
  {
    [SET_NAME]: (state, { payload }) => ({ ...state, name: payload }),
    [SET_EMAIL]: (state, { payload }) => ({ ...state, email: payload }),
  },
  { name: "", email: "" }
);

// After
const user = createReducer({ name: "", email: "" }, (builder) => {
  builder
    .addCase(SET_NAME, (state, { payload }) => {
      state.name = payload; // Immer allows direct mutation
    })
    .addCase(SET_EMAIL, (state, { payload }) => {
      state.email = payload;
    });
});
```

### Example 3: Using handleActionsToCreateReducer

```javascript
// Before
const settings = handleActions(
  {
    [TOGGLE_DARK_MODE]: (state) => ({ ...state, darkMode: !state.darkMode }),
    [SET_LANGUAGE]: (state, { payload }) => ({ ...state, language: payload }),
  },
  { darkMode: false, language: "en" }
);

// After
const settings = handleActionsToCreateReducer(
  {
    [TOGGLE_DARK_MODE]: (state) => ({ ...state, darkMode: !state.darkMode }),
    [SET_LANGUAGE]: (state, { payload }) => ({ ...state, language: payload }),
  },
  { darkMode: false, language: "en" }
);
```

## Benefits of Migration

1. **Simplified Redux Logic**: Redux Toolkit significantly reduces boilerplate
2. **Immer Integration**: State mutations are allowed in reducers thanks to Immer
3. **TypeScript Support**: Better type inference and support
4. **Future-proof**: Aligned with Redux official recommendations
5. **Additional Features**: RTK includes utilities for common patterns (createSlice, createAsyncThunk)

## Migration Timeline

The migration should be done gradually, file by file. Priority should be given to:

1. Core Redux files in `/frontend/src/metabase/redux/`
2. Files with complex Redux logic
3. New Redux files should use Redux Toolkit directly

Eventually, all `handleActions` imports should be removed and replaced with direct imports from Redux Toolkit.