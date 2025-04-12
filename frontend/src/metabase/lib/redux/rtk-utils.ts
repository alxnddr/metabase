import { createReducer } from "@reduxjs/toolkit";
import type { AnyAction } from "redux";

/**
 * Converts a handleActions-style reducer to a createReducer-style reducer.
 * Use this for migrating from redux-actions to Redux Toolkit.
 * 
 * @param handlers - Object mapping action types to handler functions
 * @param initialState - The initial state of the reducer
 * @returns A reducer created with Redux Toolkit's createReducer
 * 
 * @example
 * // Old way with handleActions:
 * const myReducer = handleActions(
 *   {
 *     [ACTION_TYPE]: (state, { payload }) => ({ ...state, value: payload }),
 *   },
 *   initialState
 * );
 * 
 * // New way with handleActionsToCreateReducer:
 * const myReducer = handleActionsToCreateReducer(
 *   {
 *     [ACTION_TYPE]: (state, { payload }) => ({ ...state, value: payload }),
 *   },
 *   initialState
 * );
 */
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