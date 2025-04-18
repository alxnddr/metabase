/* istanbul ignore file */
import dayjs from "dayjs";

import { createMockEntitiesState } from "__support__/store";
import { checkNotNull } from "metabase/lib/types";
import { getMetadata } from "metabase/selectors/metadata";
import * as Lib from "metabase-lib";
import {
  createQuery as _createQuery,
  columnFinder,
} from "metabase-lib/test-helpers";
import { TYPE } from "metabase-lib/v1/types/constants";
import { createMockField, createMockSegment } from "metabase-types/api/mocks";
import {
  ORDERS,
  ORDERS_ID,
  PEOPLE_ID,
  PRODUCTS_ID,
  createOrdersTable,
  createPeopleTable,
  createProductsTable,
  createSampleDatabase,
} from "metabase-types/api/mocks/presets";
import { createMockState } from "metabase-types/store/mocks";

const SEGMENT_1 = createMockSegment({
  id: 1,
  table_id: ORDERS_ID,
  name: "Discounted",
  description: "Discounted",
  definition: {
    "source-table": ORDERS_ID,
    filter: ["not-null", ["field", ORDERS.DISCOUNT, null]],
  },
});

const SEGMENT_2 = createMockSegment({
  id: 2,
  table_id: ORDERS_ID,
  name: "Many items",
  description: "Orders with more than 5 items",
  definition: {
    "source-table": ORDERS_ID,
    filter: [">", ["field", ORDERS.QUANTITY, null], 20],
  },
});

const BOOLEAN_FIELD = createMockField({
  id: 100,
  table_id: PEOPLE_ID,
  name: "IS_ACTIVE",
  display_name: "Is Active",

  base_type: TYPE.Boolean,
  effective_type: TYPE.Boolean,
  semantic_type: null,
});

const STRING_FIELD_NO_VALUES = createMockField({
  id: 101,
  table_id: PRODUCTS_ID,
  name: "DESCRIPTION",
  display_name: "Description",

  base_type: TYPE.Text,
  effective_type: TYPE.Text,
  semantic_type: null,

  has_field_values: "none",
});

const TIME_FIELD = createMockField({
  id: 102,
  table_id: ORDERS_ID,
  name: "TIME",
  display_name: "Time",

  base_type: TYPE.Time,
  effective_type: TYPE.Time,
  semantic_type: null,
});

const UNKNOWN_FIELD = createMockField({
  id: 103,
  table_id: ORDERS_ID,
  name: "UNKNOWN",
  display_name: "Unknown",
  base_type: "type/*",
  effective_type: "type/*",
  semantic_type: null,
});

const _ordersFields = createOrdersTable().fields?.filter(checkNotNull) ?? [];
const _peopleFields = createPeopleTable().fields?.filter(checkNotNull) ?? [];
const _productsFields =
  createProductsTable().fields?.filter(checkNotNull) ?? [];

const database = createSampleDatabase({
  tables: [
    createOrdersTable({
      fields: [..._ordersFields, TIME_FIELD, UNKNOWN_FIELD],
      segments: [SEGMENT_1, SEGMENT_2],
    }),
    createPeopleTable({ fields: [..._peopleFields, BOOLEAN_FIELD] }),
    createProductsTable({
      fields: [..._productsFields, STRING_FIELD_NO_VALUES],
    }),
  ],
});

export const storeInitialState = createMockState({
  entities: createMockEntitiesState({
    databases: [database],
    segments: [SEGMENT_1, SEGMENT_2],
  }),
});

export const metadata = getMetadata(storeInitialState);

export function createQuery() {
  return _createQuery({ metadata });
}

export function createFilteredQuery(
  initialQuery: Lib.Query,
  clause: Lib.ExpressionClause | Lib.SegmentMetadata,
) {
  const query = Lib.filter(initialQuery, 0, clause);
  const [filter] = Lib.filters(query, 0);
  const column = Lib.filterParts(query, 0, filter)?.column;
  return { query, filter, column };
}

function findFilteredColumn(
  query: Lib.Query,
  tableName: string,
  columnName: string,
) {
  const columns = Lib.filterableColumns(query, 0);
  const findColumn = columnFinder(query, columns);
  return findColumn(tableName, columnName);
}

export function findBooleanColumn(query: Lib.Query) {
  return findFilteredColumn(query, "PEOPLE", "IS_ACTIVE");
}

type BooleanFilterQueryOpts = Partial<Lib.BooleanFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithBooleanFilter({
  query = createQuery(),
  column = findBooleanColumn(query),
  operator = "=",
  values = [true],
}: BooleanFilterQueryOpts = {}) {
  const clause = Lib.booleanFilterClause({ operator, column, values });
  return createFilteredQuery(query, clause);
}

export function findLatitudeColumn(query: Lib.Query) {
  return findFilteredColumn(query, "PEOPLE", "LATITUDE");
}

export function findLongitudeColumn(query: Lib.Query) {
  return findFilteredColumn(query, "PEOPLE", "LONGITUDE");
}

type CoordinateFilterQueryOpts = Partial<Lib.CoordinateFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithCoordinateFilter({
  query = createQuery(),
  column = findLatitudeColumn(query),
  longitudeColumn = null,
  operator = "=",
  values = [0],
  ...parts
}: CoordinateFilterQueryOpts = {}) {
  const clause = Lib.coordinateFilterClause({
    operator,
    column,
    longitudeColumn,
    values,
    ...parts,
  });
  return createFilteredQuery(query, clause);
}

export function findNumericColumn(query: Lib.Query) {
  return findFilteredColumn(query, "ORDERS", "TOTAL");
}

type NumberFilterQueryOpts = Partial<Lib.NumberFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithNumberFilter({
  query = createQuery(),
  column = findNumericColumn(query),
  operator = "=",
  values = [0],
}: NumberFilterQueryOpts = {}) {
  const clause = Lib.numberFilterClause({ operator, column, values });
  return createFilteredQuery(query, clause);
}

export function findStringColumn(
  query: Lib.Query,
  tableName = "PRODUCTS",
  columnName = "DESCRIPTION",
) {
  return findFilteredColumn(query, tableName, columnName);
}

type StringFilterOpts = Partial<Lib.StringFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithStringFilter({
  query = createQuery(),
  column = findStringColumn(query),
  operator = "=",
  values = [""],
  options = {},
}: StringFilterOpts = {}) {
  const clause = Lib.stringFilterClause({ operator, column, values, options });
  return createFilteredQuery(query, clause);
}

export function findDateColumn(query: Lib.Query) {
  return findFilteredColumn(query, "PEOPLE", "BIRTH_DATE");
}

export function findDateTimeColumn(query: Lib.Query) {
  return findFilteredColumn(query, "ORDERS", "CREATED_AT");
}

type SpecificDateFilterOpts = Partial<Lib.SpecificDateFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithSpecificDateFilter({
  query = createQuery(),
  column = findDateTimeColumn(query),
  operator = "=",
  values = [new Date(2020, 1, 15)],
  hasTime = false,
}: SpecificDateFilterOpts = {}) {
  const clause = Lib.specificDateFilterClause({
    operator,
    column,
    values,
    hasTime,
  });
  return createFilteredQuery(query, clause);
}

type RelativeDateFilterOpts = Partial<Lib.RelativeDateFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithRelativeDateFilter({
  query = createQuery(),
  column = findDateTimeColumn(query),
  value = -20,
  unit = "day",
  offsetValue = null,
  offsetUnit = null,
  options = {},
}: RelativeDateFilterOpts = {}) {
  const clause = Lib.relativeDateFilterClause({
    column,
    value,
    unit,
    offsetValue,
    offsetUnit,
    options,
  });
  return createFilteredQuery(query, clause);
}

type ExcludeDateFilterOpts = Partial<Lib.ExcludeDateFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithExcludeDateFilter({
  query = createQuery(),
  column = findDateTimeColumn(query),
  operator = "!=",
  values = [1],
  unit = "day-of-week",
}: ExcludeDateFilterOpts = {}) {
  const clause = Lib.excludeDateFilterClause({
    column,
    operator,
    values,
    unit,
  });
  return createFilteredQuery(query, clause);
}

export function findTimeColumn(query: Lib.Query) {
  return findFilteredColumn(query, "ORDERS", "TIME");
}

type TimeFilterOpts = Partial<Lib.TimeFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithTimeFilter({
  query = createQuery(),
  column = findTimeColumn(query),
  operator = ">",
  values = [dayjs().startOf("day").toDate()],
}: TimeFilterOpts = {}) {
  const clause = Lib.timeFilterClause({ operator, column, values });
  return createFilteredQuery(query, clause);
}

export function findUnknownColumn(query: Lib.Query) {
  return findFilteredColumn(query, "ORDERS", UNKNOWN_FIELD.name);
}

type DefaultFilterQueryOpts = Partial<Lib.DefaultFilterParts> & {
  query?: Lib.Query;
  column?: Lib.ColumnMetadata;
};

export function createQueryWithDefaultFilter({
  query = createQuery(),
  column = findUnknownColumn(query),
  operator = "is-null",
}: DefaultFilterQueryOpts = {}) {
  const clause = Lib.defaultFilterClause({ operator, column });
  return createFilteredQuery(query, clause);
}
