// Query model shared by the URL, the client, the server function, and (as a
// contract) the PL/SQL API. A query is: quick text + typed filters + sort + page.

import { FIELD_BY_KEY, DEFAULT_COLUMNS, type FieldTypeT } from "./fields";

export type OpT =
  | "contains" | "notContains" | "equals" | "startsWith" | "in"
  | "eq" | "gt" | "gte" | "lt" | "lte" | "between"
  | "on" | "before" | "after"
  | "is"
  | "isEmpty" | "isNotEmpty";

export type FilterT = { field: string; op: OpT; value?: string; value2?: string };

export type QueryT = {
  quick: string;
  filters: FilterT[];
  sort: string;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
  columns: string[];
};

export const OPS_BY_TYPE: Record<FieldTypeT, { op: OpT; label: string; values: 0 | 1 | 2 }[]> = {
  text: [
    { op: "contains", label: "contains", values: 1 },
    { op: "notContains", label: "does not contain", values: 1 },
    { op: "equals", label: "equals", values: 1 },
    { op: "startsWith", label: "starts with", values: 1 },
    { op: "in", label: "is any of (comma-separated)", values: 1 },
    { op: "isEmpty", label: "is empty", values: 0 },
    { op: "isNotEmpty", label: "is not empty", values: 0 },
  ],
  clob: [
    { op: "contains", label: "contains", values: 1 },
    { op: "notContains", label: "does not contain", values: 1 },
    { op: "isEmpty", label: "is empty", values: 0 },
    { op: "isNotEmpty", label: "is not empty", values: 0 },
  ],
  number: [
    { op: "eq", label: "=", values: 1 },
    { op: "gt", label: ">", values: 1 },
    { op: "gte", label: "≥", values: 1 },
    { op: "lt", label: "<", values: 1 },
    { op: "lte", label: "≤", values: 1 },
    { op: "between", label: "between", values: 2 },
    { op: "isEmpty", label: "is empty", values: 0 },
    { op: "isNotEmpty", label: "is not empty", values: 0 },
  ],
  date: [
    { op: "on", label: "on", values: 1 },
    { op: "before", label: "before", values: 1 },
    { op: "after", label: "after", values: 1 },
    { op: "between", label: "between", values: 2 },
    { op: "isEmpty", label: "is empty", values: 0 },
    { op: "isNotEmpty", label: "is not empty", values: 0 },
  ],
  timestamp: [
    { op: "on", label: "on", values: 1 },
    { op: "before", label: "before", values: 1 },
    { op: "after", label: "after", values: 1 },
    { op: "between", label: "between", values: 2 },
    { op: "isEmpty", label: "is empty", values: 0 },
    { op: "isNotEmpty", label: "is not empty", values: 0 },
  ],
  flag: [{ op: "is", label: "is", values: 1 }],
};

export const DEFAULT_QUERY: QueryT = {
  quick: "",
  filters: [],
  sort: "postedDate",
  dir: "desc",
  page: 1,
  pageSize: 25,
  columns: DEFAULT_COLUMNS,
};

export const PAGE_SIZES = [25, 50, 100];

// ---- URL <-> query -------------------------------------------------------
// f=field|op|value|value2 (values URI-encoded), repeated. q, sort, dir, page, ps, cols.

type ParamsT = Record<string, string | string[] | undefined>;

export function decodeQuery(params: ParamsT): QueryT {
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const filters: FilterT[] = [];
  for (const raw of list(params.f)) {
    const [field, op, v1, v2] = raw.split("|");
    const f = FIELD_BY_KEY[field];
    if (!f || !op) continue;
    if (!OPS_BY_TYPE[f.type].some((o) => o.op === op)) continue;
    filters.push({
      field,
      op: op as OpT,
      value: v1 !== undefined ? decodeURIComponent(v1) : undefined,
      value2: v2 !== undefined ? decodeURIComponent(v2) : undefined,
    });
  }
  const sort = typeof params.sort === "string" && FIELD_BY_KEY[params.sort] ? params.sort : DEFAULT_QUERY.sort;
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(String(params.page ?? "1"), 10) || 1);
  const ps = parseInt(String(params.ps ?? ""), 10);
  const pageSize = PAGE_SIZES.includes(ps) ? ps : DEFAULT_QUERY.pageSize;
  const cols = typeof params.cols === "string" ? params.cols.split(",").filter((c) => FIELD_BY_KEY[c]) : [];
  return {
    quick: typeof params.q === "string" ? params.q : "",
    filters,
    sort,
    dir,
    page,
    pageSize,
    columns: cols.length ? cols : DEFAULT_COLUMNS,
  };
}

export function encodeQuery(q: QueryT): string {
  const sp = new URLSearchParams();
  if (q.quick) sp.set("q", q.quick);
  for (const f of q.filters) {
    const parts = [f.field, f.op];
    if (f.value !== undefined) parts.push(encodeURIComponent(f.value));
    if (f.value2 !== undefined) parts.push(encodeURIComponent(f.value2));
    sp.append("f", parts.join("|"));
  }
  if (q.sort !== DEFAULT_QUERY.sort || q.dir !== DEFAULT_QUERY.dir) {
    sp.set("sort", q.sort);
    sp.set("dir", q.dir);
  }
  if (q.page > 1) sp.set("page", String(q.page));
  if (q.pageSize !== DEFAULT_QUERY.pageSize) sp.set("ps", String(q.pageSize));
  if (q.columns.join(",") !== DEFAULT_COLUMNS.join(",")) sp.set("cols", q.columns.join(","));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Drop filters that need a value but have none, so they never reach the API. */
export function effectiveFilters(filters: FilterT[]): FilterT[] {
  return filters.filter((f) => {
    const field = FIELD_BY_KEY[f.field];
    if (!field) return false;
    const spec = OPS_BY_TYPE[field.type].find((o) => o.op === f.op);
    if (!spec) return false;
    if (spec.values >= 1 && !f.value?.trim()) return false;
    if (spec.values === 2 && !f.value2?.trim()) return false;
    return true;
  });
}

// ---- Result shape returned by the API (and the sample evaluator) ----------
export type OpportunityRowT = Record<string, string | number | null>;

export type QueryResultT = {
  rows: OpportunityRowT[];
  total: number;
  page: number;
  pageSize: number;
  source: "dbtwig" | "sample";
  errorMessage?: string;
  httpStatus?: number;
  apiCall: string;
};
