"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { FIELDS, FIELD_BY_KEY, GROUPS, DEFAULT_COLUMNS, type FieldT } from "./fields";
import {
  OPS_BY_TYPE, PAGE_SIZES, encodeQuery, effectiveFilters,
  type FilterT, type OpT, type QueryT, type QueryResultT,
} from "./queryModel";
import { ResultsTable } from "./ResultsTable";

const BASE = "/workspace/opportunities";

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// One-click starting points. Each is a plain filter set, so it shows up in
// the builder and can be edited.
const PRESETS: { label: string; filters: FilterT[] }[] = [
  { label: "Active", filters: [{ field: "active", op: "is", value: "Yes" }] },
  { label: "Deadline upcoming", filters: [{ field: "active", op: "is", value: "Yes" }, { field: "responseDeadline", op: "after", value: today(-1) }] },
  { label: "Posted last 30 days", filters: [{ field: "postedDate", op: "after", value: today(-30) }] },
  { label: "SDVOSB set-aside", filters: [{ field: "setAsideCode", op: "in", value: "SDVOSBC,SDVOSBS" }] },
  { label: "Not rejected", filters: [{ field: "rejectedByUser", op: "is", value: "N" }] },
];

function blankFilter(): FilterT {
  return { field: "title", op: "contains", value: "" };
}

export function QueryScreen({ query, result }: { query: QueryT; result: QueryResultT }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<QueryT>(query);
  const [showColumns, setShowColumns] = useState(false);

  function navigate(q: QueryT) {
    const url = BASE + encodeQuery(q);
    console.log("[opportunities] run →", url);
    startTransition(() => router.push(url));
  }

  function run(overrides: Partial<QueryT> = {}) {
    navigate({ ...draft, ...overrides, page: 1 });
  }

  function updateFilter(i: number, patch: Partial<FilterT>) {
    setDraft((d) => {
      const filters = d.filters.slice();
      let f = { ...filters[i], ...patch };
      if (patch.field) {
        const field = FIELD_BY_KEY[patch.field];
        const ops = OPS_BY_TYPE[field.type];
        if (!ops.some((o) => o.op === f.op)) f = { ...f, op: ops[0].op, value: field.type === "flag" ? field.flagValues?.[0][0] : "", value2: "" };
      }
      filters[i] = f;
      return { ...d, filters };
    });
  }

  function applyPreset(p: { filters: FilterT[] }) {
    setDraft((d) => {
      const existing = d.filters.filter((f) => !p.filters.some((pf) => pf.field === f.field));
      return { ...d, filters: [...existing, ...p.filters] };
    });
  }

  function reset() {
    const q: QueryT = { ...query, quick: "", filters: [], page: 1, sort: "postedDate", dir: "desc", columns: DEFAULT_COLUMNS };
    setDraft(q);
    navigate(q);
  }

  const active = effectiveFilters(query.filters).length + (query.quick ? 1 : 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Opportunities</h2>
          <p>Query the bid_opportunities feed on any field. Filters combine with AND; the quick search matches title, solicitation, notice ID, agency, office, and awardee.</p>
        </div>
      </div>

      <section className="qb" aria-label="Query builder">
        <div className="qb-quick">
          <div className="control">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Quick search — e.g. cybersecurity, W91ZLK, NAVFAC"
              value={draft.quick}
              onChange={(e) => setDraft({ ...draft, quick: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && run()}
              aria-label="Quick search"
            />
          </div>
          <button type="button" className="btn primary" onClick={() => run()} disabled={pending}>
            {pending ? "Running…" : "Run query"}
          </button>
        </div>

        <div className="qb-presets" aria-label="Presets">
          <span>Start from:</span>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>

        <div className="qb-filters">
          {draft.filters.map((f, i) => {
            const field = FIELD_BY_KEY[f.field];
            const ops = OPS_BY_TYPE[field.type];
            const spec = ops.find((o) => o.op === f.op) ?? ops[0];
            return (
              <div className="qb-row" key={i}>
                <select value={f.field} onChange={(e) => updateFilter(i, { field: e.target.value })} aria-label="Field">
                  {GROUPS.map((g) => (
                    <optgroup label={g} key={g}>
                      {FIELDS.filter((x) => x.group === g).map((x) => (
                        <option key={x.key} value={x.key}>{x.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select value={f.op} onChange={(e) => updateFilter(i, { op: e.target.value as OpT })} aria-label="Operator">
                  {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                </select>
                {spec.values >= 1 && <ValueInput field={field} value={f.value ?? ""} onChange={(v) => updateFilter(i, { value: v })} onEnter={() => run()} />}
                {spec.values === 2 && (
                  <>
                    <span className="qb-and">and</span>
                    <ValueInput field={field} value={f.value2 ?? ""} onChange={(v) => updateFilter(i, { value2: v })} onEnter={() => run()} />
                  </>
                )}
                <button type="button" className="icon-btn" aria-label="Remove filter" onClick={() => setDraft({ ...draft, filters: draft.filters.filter((_, j) => j !== i) })}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            );
          })}
          <div className="qb-actions">
            <button type="button" className="btn quiet" onClick={() => setDraft({ ...draft, filters: [...draft.filters, blankFilter()] })}>
              <Icon name="plus" size={14} /> Add filter
            </button>
            <button type="button" className="btn quiet" onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns}>
              Columns ({draft.columns.length})
            </button>
            {(active > 0 || draft.filters.length > 0) && (
              <button type="button" className="link-btn" onClick={reset}>Reset</button>
            )}
          </div>
          {showColumns && (
            <div className="qb-columns">
              {GROUPS.map((g) => (
                <fieldset key={g}>
                  <legend>{g}</legend>
                  {FIELDS.filter((x) => x.group === g).map((x) => (
                    <label key={x.key}>
                      <input
                        type="checkbox"
                        checked={draft.columns.includes(x.key)}
                        onChange={(e) => {
                          const cols = e.target.checked
                            ? FIELDS.filter((y) => draft.columns.includes(y.key) || y.key === x.key).map((y) => y.key)
                            : draft.columns.filter((c) => c !== x.key);
                          setDraft({ ...draft, columns: cols.length ? cols : ["noticeId"] });
                        }}
                      />
                      {x.label}
                    </label>
                  ))}
                </fieldset>
              ))}
              <div className="qb-columns-actions">
                <button type="button" className="btn quiet" onClick={() => run()}>Apply columns</button>
                <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, columns: DEFAULT_COLUMNS })}>Default columns</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <ResultsTable
        query={query}
        result={result}
        pending={pending}
        onSort={(key) => navigate({ ...query, sort: key, dir: query.sort === key && query.dir === "desc" ? "asc" : "desc", page: 1 })}
        onPage={(page) => navigate({ ...query, page })}
        onPageSize={(pageSize) => navigate({ ...query, pageSize, page: 1 })}
      />
    </>
  );
}

function ValueInput({ field, value, onChange, onEnter }: { field: FieldT; value: string; onChange: (v: string) => void; onEnter: () => void }) {
  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onEnter(),
    "aria-label": "Value",
  };
  if (field.type === "flag") {
    return (
      <select {...common}>
        {field.flagValues?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  }
  if (field.type === "date" || field.type === "timestamp") return <input type="date" {...common} />;
  if (field.type === "number") return <input type="number" step="any" {...common} />;
  const listId = field.suggestions ? `dl-${field.key}` : undefined;
  return (
    <>
      <input type="text" list={listId} placeholder={field.type === "clob" ? "text in description" : field.label} {...common} />
      {field.suggestions && (
        <datalist id={listId}>
          {field.suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </>
  );
}

export { PAGE_SIZES };
