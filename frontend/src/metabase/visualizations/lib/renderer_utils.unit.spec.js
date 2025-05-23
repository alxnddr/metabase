import moment from "moment-timezone"; // eslint-disable-line no-restricted-imports -- deprecated usage

import {
  getXValues,
  parseXValue,
} from "metabase/visualizations/lib/renderer_utils";

describe("getXValues", () => {
  function getXValuesForRows(listOfRows, settings = {}) {
    const series = listOfRows.map((rows) => ({ data: { rows, cols: [{}] } }));
    series._raw = series;
    return getXValues({ settings, series });
  }

  it("should not change the order of a single series of ascending numbers", () => {
    expect(getXValuesForRows([[[1], [2], [11]]])).toEqual([1, 2, 11]);
  });

  it("should not change the order of a single series of descending numbers", () => {
    expect(getXValuesForRows([[[11], [2], [1]]])).toEqual([11, 2, 1]);
  });

  it("should not change the order of a single series of non-ordered numbers", () => {
    expect(getXValuesForRows([[[2], [1], [11]]])).toEqual([2, 1, 11]);
  });

  it("should not change the order of a single series of ascending strings", () => {
    expect(getXValuesForRows([[["1"], ["2"], ["11"]]])).toEqual([
      "1",
      "2",
      "11",
    ]);
  });

  it("should not change the order of a single series of descending strings", () => {
    expect(getXValuesForRows([[["1"], ["2"], ["11"]]])).toEqual([
      "1",
      "2",
      "11",
    ]);
  });

  it("should not change the order of a single series of non-ordered strings", () => {
    expect(getXValuesForRows([[["2"], ["1"], ["11"]]])).toEqual([
      "2",
      "1",
      "11",
    ]);
  });

  it("should correctly merge multiple series of ascending numbers", () => {
    expect(
      getXValuesForRows([
        [[2], [11], [12]],
        [[1], [2], [11]],
      ]),
    ).toEqual([1, 2, 11, 12]);
  });

  it("should correctly merge multiple series of descending numbers", () => {
    expect(
      getXValuesForRows([
        [[12], [11], [2]],
        [[11], [2], [1]],
      ]),
    ).toEqual([12, 11, 2, 1]);
  });

  it("should use raw row ordering rather than broken out series", () => {
    const series = [
      // these are broken out series. the ordering here is ignored
      { data: { rows: [["a"], ["b"]], cols: [{}] } },
      { data: { rows: [["c"], ["d"]], cols: [{}] } },
    ];
    series._raw = [
      { data: { rows: [["d"], ["c"], ["b"], ["a"]], cols: [{}] } },
    ];
    const settings = {};
    expect(getXValues({ settings, series })).toEqual(["d", "c", "b", "a"]);
  });

  it("should return empty array when data has no rows and columns", () => {
    const series = [{ data: { rows: [], cols: [] } }];
    series._raw = [{ data: { rows: [], cols: [] } }];

    expect(getXValues({ settings: {}, series })).toEqual([]);
  });

  it("should use the correct column as the dimension for raw series", () => {
    const series = [
      {
        data: {
          rows: [["second", "first"]],
          cols: [{ name: "second" }, { name: "first" }],
        },
      },
    ];
    series._raw = [
      {
        data: {
          rows: [["first", "second"]],
          cols: [{ name: "first" }, { name: "second" }],
        },
      },
    ];
    const settings = { "graph.dimensions": ["second"] };
    expect(getXValues({ settings, series })).toEqual(["second"]);
  });

  it("should use the correct column as the dimension for parsing options", () => {
    const series = [
      {
        data: {
          rows: [["foo", "2019-09-01T00:00:00Z"]],
          cols: [
            { name: "other" },
            { name: "date", base_type: "type/DateTime" },
          ],
        },
      },
    ];
    series._raw = series;
    const settings = { "graph.dimensions": ["date"] };
    const [xVal] = getXValues({ settings, series });
    expect(moment.isMoment(xVal)).toBe(true);
  });

  it("should sort values according to parsed value", () => {
    expect(
      getXValuesForRows(
        [
          [["2019-W33"], ["2019-08-13"]],
          [["2019-08-11"], ["2019-W33"]],
        ],
        { "graph.x_axis.scale": "timeseries" },
      ).map((x) => x.format()),
    ).toEqual([
      "2019-08-11T00:00:00Z",
      "2019-08-12T00:00:00Z",
      "2019-08-13T00:00:00Z",
    ]);
  });

  it("should include nulls for ordinal", () => {
    const settings = { "graph.x_axis.scale": "ordinal" };
    const xValues = getXValuesForRows([[["foo"], [null], ["bar"]]], settings);
    expect(xValues).toEqual(["foo", "(empty)", "bar"]);
  });

  it("should exclude nulls for histograms", () => {
    const xValues = getXValuesForRows([[["foo"], [null], ["bar"]]], {
      "graph.x_axis.scale": "histogram",
    });
    expect(xValues).toEqual(["foo", "bar"]);
  });

  it("should exclude nulls for timeseries", () => {
    const xValues = getXValuesForRows(
      [[["2019-01-02"], [null], ["2019-01-03"]]],
      {
        "graph.x_axis.scale": "timeseries",
      },
    );
    const formattedXValues = xValues.map((v) => v.format("YYYY-MM-DD"));
    expect(formattedXValues).toEqual(["2019-01-02", "2019-01-03"]);
  });

  it("should exclude values that cannot be parsed according to the column type", () => {
    const xValues = getXValuesForRows(
      [[["2019-01-02"], ["abc"], ["2019-01-03"]]],
      {
        "graph.x_axis.scale": "timeseries",
      },
    );
    const formattedXValues = xValues.map((v) => v.format("YYYY-MM-DD"));
    expect(formattedXValues).toEqual(["2019-01-02", "2019-01-03"]);
  });
});

describe("parseXValue", () => {
  it("should use options as part of the cache key", () => {
    const value1 = parseXValue("2018-08-23", { isTimeseries: true });
    const value2 = parseXValue("2018-08-23", { isTimeseries: false });
    expect(moment.isMoment(value1)).toBe(true);
    expect(moment.isMoment(value2)).toBe(false);
  });

  it("should warn repeatedly (despite caching)", () => {
    const warn = jest.fn();
    parseXValue("2018-W60", { isTimeseries: true }, warn);
    parseXValue("2018-W60", { isTimeseries: true }, warn);
    expect(warn.mock.calls.length).toBe(2);
  });
});
