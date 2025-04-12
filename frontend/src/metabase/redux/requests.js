import { createAction, createReducer } from "@reduxjs/toolkit";
import { assoc, getIn, updateIn } from "icepick";

export const setRequestLoading = createAction(
  "metabase/requests/SET_REQUEST_LOADING",
  (statePath, queryKey) => ({
    statePath,
    queryKey,
  }),
);
export const setRequestPromise = createAction(
  "metabase/requests/SET_REQUEST_PROMISE",
  (statePath, queryKey, queryPromise) => ({
    statePath,
    queryKey,
    queryPromise,
  }),
);
export const setRequestLoaded = createAction(
  "metabase/requests/SET_REQUEST_LOADED",
  (statePath, queryKey) => ({ statePath, queryKey }),
);
export const setRequestError = createAction(
  "metabase/requests/SET_REQUEST_ERROR",
  (statePath, queryKey, error) => ({ statePath, queryKey, error }),
);
export const setRequestUnloaded = createAction(
  "metabase/requests/SET_REQUEST_UNLOADED",
  (statePath) => ({ statePath }),
);

const initialRequestState = {
  loading: false,
  loaded: false,
  fetched: false,
  error: null,
  _isRequestState: true,
};

const requestStateReducer = createReducer(initialRequestState, (builder) => {
  builder
    .addCase(setRequestLoading, (state, { payload: { queryKey, queryPromise } }) => {
      state.queryKey = queryKey;
      state.queryPromise = queryPromise;
      state.loading = true;
      state.loaded = false;
      state.error = null;
    })
    .addCase(setRequestPromise, (state, { payload: { queryKey, queryPromise } }) => {
      state.queryKey = queryKey;
      state.queryPromise = queryPromise;
    })
    .addCase(setRequestLoaded, (state, { payload: { queryKey } }) => {
      state.queryKey = queryKey;
      state.loading = false;
      state.loaded = true;
      state.error = null;
      state.fetched = true;
    })
    .addCase(setRequestError, (state, { payload: { queryKey, error } }) => {
      state.queryKey = queryKey;
      state.loading = false;
      state.loaded = false;
      state.error = error;
    })
    .addCase(setRequestUnloaded, (state) => {
      state.loaded = false;
      state.error = null;
      state.queryPromise = null;
    });
});

function requestStateReducerRecursive(state, action) {
  if (!state || state._isRequestState) {
    return requestStateReducer(state, action);
  } else {
    for (const [key, subState] of Object.entries(state)) {
      state = assoc(state, key, requestStateReducerRecursive(subState, action));
    }
    return state;
  }
}

const isBulkInvalidation = (statePath) => {
  // Bulk invalidations only have a statePath with a length of 2
  return statePath.length <= 2;
};

export default (state = {}, action) => {
  if (action && action.payload && action.payload.statePath) {
    const statePath = action.payload.statePath;
    const hasStateToUpdate = !!getIn(state, statePath);

    if (hasStateToUpdate || !isBulkInvalidation(statePath)) {
      state = updateIn(state, action.payload.statePath, (subState) =>
        requestStateReducerRecursive(subState, action),
      );
    }
  }
  return state;
};
