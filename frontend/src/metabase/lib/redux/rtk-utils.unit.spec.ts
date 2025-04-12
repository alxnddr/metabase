import { handleActionsToCreateReducer } from "./rtk-utils";

describe("handleActionsToCreateReducer", () => {
  const INCREMENT = "INCREMENT";
  const DECREMENT = "DECREMENT";
  const SET_VALUE = "SET_VALUE";

  it("should create a reducer that handles primitive state", () => {
    const counterReducer = handleActionsToCreateReducer(
      {
        [INCREMENT]: (state: number) => state + 1,
        [DECREMENT]: (state: number) => state - 1,
      },
      0
    );

    expect(counterReducer(undefined, { type: "@@INIT" })).toBe(0);
    expect(counterReducer(5, { type: INCREMENT })).toBe(6);
    expect(counterReducer(5, { type: DECREMENT })).toBe(4);
    expect(counterReducer(5, { type: "UNKNOWN" })).toBe(5);
  });

  it("should create a reducer that handles object state", () => {
    interface CounterState {
      value: number;
      lastAction: string | null;
    }

    const initialState: CounterState = { value: 0, lastAction: null };

    const counterReducer = handleActionsToCreateReducer<CounterState>(
      {
        [INCREMENT]: (state) => ({
          ...state,
          value: state.value + 1,
          lastAction: INCREMENT,
        }),
        [DECREMENT]: (state) => ({
          ...state,
          value: state.value - 1,
          lastAction: DECREMENT,
        }),
      },
      initialState
    );

    expect(counterReducer(undefined, { type: "@@INIT" })).toEqual(initialState);
    
    expect(counterReducer(initialState, { type: INCREMENT })).toEqual({
      value: 1,
      lastAction: INCREMENT,
    });
    
    expect(
      counterReducer({ value: 5, lastAction: null }, { type: DECREMENT })
    ).toEqual({
      value: 4,
      lastAction: DECREMENT,
    });
  });

  it("should handle actions with payloads", () => {
    interface ValueState {
      value: number;
      lastUpdated: number | null;
    }

    const initialState: ValueState = { value: 0, lastUpdated: null };

    const valueReducer = handleActionsToCreateReducer<ValueState>(
      {
        [SET_VALUE]: (state, { payload }) => ({
          ...state,
          value: payload,
          lastUpdated: Date.now(),
        }),
      },
      initialState
    );

    const result = valueReducer(initialState, {
      type: SET_VALUE,
      payload: 42,
    });

    expect(result.value).toBe(42);
    expect(result.lastUpdated).not.toBeNull();
  });
});