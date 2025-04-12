import {
  type PayloadAction,
  createAction as rtkCreateAction,
  createReducer,
  createSlice,
} from "@reduxjs/toolkit";
import { LOCATION_CHANGE, push } from "react-router-redux";

import {
  isSmallScreen,
  openInBlankWindow,
  shouldOpenInBlankWindow,
} from "metabase/lib/dom";
import { combineReducers } from "metabase/lib/redux";
import type {
  Dispatch,
  TempStorage,
  TempStorageKey,
  TempStorageValue,
} from "metabase-types/store";

interface LocationPayload {
  pathname: string;
  search: string;
  hash: string;
  action: string;
  key: string;
  state?: any;
  query?: any;
}

export const SET_ERROR_PAGE = "metabase/app/SET_ERROR_PAGE";

export function setErrorPage(error: any) {
  console.error("Error:", error);
  return {
    type: SET_ERROR_PAGE,
    payload: error,
  };
}

interface IOpenUrlOptions {
  blank?: boolean;
  event?: Event;
  blankOnMetaOrCtrlKey?: boolean;
  blankOnDifferentOrigin?: boolean;
}

export const openUrl =
  (url: string, options: IOpenUrlOptions = {}) =>
  (dispatch: Dispatch) => {
    if (shouldOpenInBlankWindow(url, options)) {
      openInBlankWindow(url);
    } else {
      dispatch(push(url));
    }
  };

const errorPage = createReducer(null, (builder) => {
  builder
    .addCase(SET_ERROR_PAGE, (_, { payload }) => payload)
    .addCase(LOCATION_CHANGE, () => null);
});

// regexr.com/7r89i
// A word boundary is added to /model so it doesn't match /browse/models
const PATH_WITH_COLLAPSED_NAVBAR = /\/(model\b|question|dashboard|metabot).*/;

export function isNavbarOpenForPathname(pathname: string, prevState: boolean) {
  return (
    !isSmallScreen() && !PATH_WITH_COLLAPSED_NAVBAR.test(pathname) && prevState
  );
}

export const OPEN_NAVBAR = "metabase/app/OPEN_NAVBAR";
export const CLOSE_NAVBAR = "metabase/app/CLOSE_NAVBAR";
export const TOGGLE_NAVBAR = "metabase/app/TOGGLE_NAVBAR";

export const openNavbar = rtkCreateAction(OPEN_NAVBAR);
export const closeNavbar = rtkCreateAction(CLOSE_NAVBAR);
export const toggleNavbar = rtkCreateAction(TOGGLE_NAVBAR);

const isNavbarOpen = createReducer(true, (builder) => {
  builder
    .addCase(OPEN_NAVBAR, () => true)
    .addCase(TOGGLE_NAVBAR, (isOpen) => !isOpen)
    .addCase(CLOSE_NAVBAR, () => false)
    .addCase(LOCATION_CHANGE, (prevState, { payload }: PayloadAction<any>) => {
      if (payload.state?.preserveNavbarState) {
        return prevState;
      }
      
      return isNavbarOpenForPathname(payload.pathname, prevState);
    });
});

export const OPEN_DIAGNOSTICS = "metabase/app/OPEN_DIAGNOSTIC_MODAL";
export const CLOSE_DIAGNOSTICS = "metabase/app/CLOSE_DIAGNOSTIC_MODAL";

export const openDiagnostics = rtkCreateAction(OPEN_DIAGNOSTICS);
export const closeDiagnostics = rtkCreateAction(CLOSE_DIAGNOSTICS);

const isErrorDiagnosticsOpen = createReducer(false, (builder) => {
  builder
    .addCase(OPEN_DIAGNOSTICS, () => true)
    .addCase(CLOSE_DIAGNOSTICS, () => false);
});

const tempStorageSlice = createSlice({
  name: "tempStorage",
  initialState: {} as TempStorage,
  reducers: {
    setTempSetting: (
      state,
      action: PayloadAction<{
        key: TempStorageKey;
        value: TempStorageValue<TempStorageKey>;
      }>,
    ) => {
      state[action.payload.key] = action.payload.value;
    },
  },
});

export const { setTempSetting } = tempStorageSlice.actions;

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default combineReducers({
  errorPage,
  isNavbarOpen,
  isDndAvailable: (initValue: unknown) => {
    if (typeof initValue === "boolean") {
      return initValue;
    }
    return true;
  },
  isErrorDiagnosticsOpen,
  tempStorage: tempStorageSlice.reducer,
});
