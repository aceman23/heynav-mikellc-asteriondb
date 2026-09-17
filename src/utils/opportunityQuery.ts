// In-app query engine + row normalizer for bid opportunities.
//
// Used in two situations:
//   - sample mode (HEYNAV_SAMPLE_DATA=1): evaluate over the sample rows
//   - basic mode  (HEYNAV_QUERY_MODE=basic): heyNav/getBidOpportunities takes no
//     parameters yet, so the app fetches every row and evaluates here.
// The operator semantics are the same ones the future server-side
// queryBidOpportunities entry point implements; this file is the executable spec.

import { FIELDS, FIELD_BY_KEY } from "@/app/workspace/opportunities/fields";
import type { FilterT, OpportunityRowT, QueryT } from "@/app/workspace/opportunities/queryModel";

// ---- Normalization ---------------------------------------------------------

const MONTHS: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };

// Accepts ISO, Oracle DD-MON-YY / DD-MON-YYYY, and MM/DD/YYYY; returns ISO date or the input.
function normalizeDate(v: unknown): string | number | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4}|\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const yyyy = m[3].length === 2 ? "20" + m[3] : m[3];
    const mm = MONTHS[m[2].toUpperCase()];
    if (mm) return `${yyyy}-${mm}-${m[1]}${m[4] ? `T${m[4]}:${m[5]}:${m[6] ?? "00"}` : ""}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}${m[4] ? `T${m[4]}:${m[5]}:${m[6] ?? "00"}` : ""}`;
  return s;
}

function lowerKeys(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) out[k.toLowerCase().replace(/_/g, "")] = v;
  return out;
}

/** Map any reasonable spelling of the column names onto the catalog keys. */
export function normalizeRow(raw: Record<string, unknown>): OpportunityRowT {
  const flat = lowerKeys(raw);
  const row: OpportunityRowT = {};
  for (const f of FIELDS) {
    const v = flat[f.key.toLowerCase()] ?? flat[f.column.replace(/_/g, "")];
    if (v === undefined) continue;
    if (f.type === "date" || f.type === "timestamp") row[f.key] = normalizeDate(v);
    else if (f.type === "number") row[f.key] = v == null || v === "" ? null : Number(v);
    else row[f.key] = v == null ? null : (typeof v === "number" ? v : String(v));
  }
  return row;
}

/** Find the row array inside whatever envelope the entry point uses. */
export function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    for (const v of Object.values(payload as Record<string, unknown>)) {
      if (Array.isArray(v) && (v.length === 0 || typeof v[0] === "object")) return v as Record<string, unknown>[];
    }
  }
  return [];
}

/** Which catalog keys actually came back — shown in the UI so gaps are visible. */
export function presentKeys(rows: OpportunityRowT[]): string[] {
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) for (const k of Object.keys(r)) keys.add(k);
  return FIELDS.map((f) => f.key).filter((k) => keys.has(k));
}

// ---- Evaluation ------------------------------------------------------------

function cmpText(a: unknown, b: string, op: FilterT["op"]) {
  const s = a == null ? "" : String(a).toUpperCase();
  const v = b.toUpperCase();
  switch (op) {
    case "contains": return s.includes(v);
    case "notContains": return !s.includes(v);
    case "equals": return s === v;
    case "startsWith": return s.startsWith(v);
    case "in": return v.split(",").map((x) => x.trim()).filter(Boolean).includes(s);
    default: return true;
  }
}

function dayOf(v: unknown): string | null {
  if (v == null) return null;
  return String(v).slice(0, 10);
}

export function evalFilter(row: OpportunityRowT, f: FilterT): boolean {
  const field = FIELD_BY_KEY[f.field];
  if (!field) return true;
  const raw = row[f.field];
  if (f.op === "isEmpty") return raw == null || raw === "";
  if (f.op === "isNotEmpty") return !(raw == null || raw === "");
  const v = f.value ?? "";
  const v2 = f.value2 ?? "";
  switch (field.type) {
    case "text":
    case "clob":
      return cmpText(raw, v, f.op);
    case "flag":
      return String(raw ?? "").toUpperCase() === v.toUpperCase();
    case "number": {
      if (raw == null) return false;
      const n = Number(raw), a = Number(v), b = Number(v2);
      switch (f.op) {
        case "eq": return n === a;
        case "gt": return n > a;
        case "gte": return n >= a;
        case "lt": return n < a;
        case "lte": return n <= a;
        case "between": return n >= a && n <= b;
        default: return true;
      }
    }
    case "date":
    case "timestamp": {
      const day = dayOf(raw);
      if (!day) return false;
      switch (f.op) {
        case "on": return day === v;
        case "before": return day < v;
        case "after": return day > v;
        case "between": return day >= v && day <= v2;
        default: return true;
      }
    }
  }
}

const QUICK_FIELDS = ["title", "solicitationNumber", "noticeId", "departmentAgency", "subTier", "office", "awardee"];

export function evaluateRows(all: OpportunityRowT[], q: QueryT, filters: FilterT[]) {
  let rows = all.filter((r) => filters.every((f) => evalFilter(r, f)));
  if (q.quick.trim()) {
    const needle = q.quick.trim().toUpperCase();
    rows = rows.filter((r) => QUICK_FIELDS.some((k) => String(r[k] ?? "").toUpperCase().includes(needle)));
  }
  const field = FIELD_BY_KEY[q.sort];
  rows = rows.slice().sort((a, b) => {
    const x = a[q.sort], y = b[q.sort];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    const c = field?.type === "number" ? Number(x) - Number(y) : String(x).localeCompare(String(y));
    return q.dir === "asc" ? c : -c;
  });
  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(start, start + q.pageSize), total };
}
