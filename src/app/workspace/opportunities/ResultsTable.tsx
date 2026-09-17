"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { FIELD_BY_KEY, GROUPS, FIELDS } from "./fields";
import { PAGE_SIZES, type QueryT, type QueryResultT, type OpportunityRowT } from "./queryModel";

type DocT = {
  objectId: string;
  opportunityId: number | null;
  displayName: string;
  documentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmt(key: string, v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const f = FIELD_BY_KEY[key];
  if (f?.type === "date") return String(v).slice(0, 10);
  if (f?.type === "timestamp") return String(v).slice(0, 16).replace("T", " ");
  if (f?.key === "awardAmount") return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return String(v);
}

export function ResultsTable({
  query, result, pending, onSort, onPage, onPageSize,
}: {
  query: QueryT;
  result: QueryResultT;
  pending: boolean;
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const [open, setOpen] = useState<OpportunityRowT | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);

  async function openRow(row: OpportunityRowT) {
    const id = Number(row.opportunityId);
    setLoadingId(id);
    console.log("[opportunities] getBidOpportunity →", id);
    try {
      const httpResponse = await fetch(`/api/opportunities/${id}`);
      const data = (await httpResponse.json()) as Record<string, unknown>;
      if (httpResponse.ok && !data.errorMessage) {
        const full = data as OpportunityRowT;
        console.log("[opportunities] getBidOpportunity ← ok");
        setOpen(full);
      } else {
        console.log("[opportunities] getBidOpportunity ←", String(data.errorMessage ?? httpResponse.statusText));
        setOpen(row);
      }
    } catch {
      console.log("[opportunities] getBidOpportunity ← network error");
      setOpen(row);
    }
    setLoadingId(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className={`results${pending ? " is-pending" : ""}`} aria-label="Results">
      <div className="results-bar">
        <div className="results-count">
          {result.errorMessage ? (
            <span className="status bad">Query failed</span>
          ) : (
            <>
              <strong>{result.total.toLocaleString()}</strong> {result.total === 1 ? "opportunity" : "opportunities"}
              {result.total > 0 && <span className="muted"> · showing {first}–{last}</span>}
            </>
          )}
          {result.source === "sample" && <span className="tag sample">Sample data — not from the data layer</span>}
          {result.source === "basic" && (
            <span className="tag live" title={`Columns returned: ${(result.availableKeys ?? []).join(", ")}`}>
              Live · {result.apiCall} · filtered in the app · {result.availableKeys?.length ?? 0} of {FIELDS.length} columns
            </span>
          )}
        </div>
        <div className="results-paging">
          <label>
            Rows
            <select value={result.pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="icon-btn" disabled={result.page <= 1} onClick={() => onPage(result.page - 1)} aria-label="Previous page"><Icon name="chevronL" /></button>
          <span className="mono">{result.page} / {pages}</span>
          <button type="button" className="icon-btn" disabled={result.page >= pages} onClick={() => onPage(result.page + 1)} aria-label="Next page"><Icon name="chevronR" /></button>
        </div>
      </div>

      {result.errorMessage && (
        <div className="error">
          {result.errorMessage}
          <span className="code">{result.apiCall} · HTTP {result.httpStatus ?? "—"}</span>
        </div>
      )}

      {!result.errorMessage && result.rows.length === 0 && (
        <div className="panel empty">
          <h3>No opportunities match</h3>
          <p>Loosen a filter or clear the quick search. Filters combine with AND.</p>
        </div>
      )}

      {result.rows.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                {query.columns.map((key) => {
                  const f = FIELD_BY_KEY[key];
                  const sorted = query.sort === key;
                  return (
                    <th key={key} style={{ minWidth: f.width }} aria-sort={sorted ? (query.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" className={`th-btn${sorted ? " sorted" : ""}`} onClick={() => onSort(key)}>
                        {f.label}
                        {sorted && <span aria-hidden="true">{query.dir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={String(row.opportunityId)} onClick={() => openRow(row)} className={loadingId === row.opportunityId ? "loading" : ""} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openRow(row)}>
                  {query.columns.map((key) => (
                    <td key={key} className={key === "title" ? "cell-title" : FIELD_BY_KEY[key].type === "number" ? "cell-num" : ""}>
                      {fmt(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <Detail row={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Detail({ row, onClose }: { row: OpportunityRowT; onClose: () => void }) {
  const opportunityId = Number(row.opportunityId);
  const [flagged, setFlagged] = useState<string>(String(row.flaggedByUser ?? "N"));
  const [rejected, setRejected] = useState<string>(String(row.rejectedByUser ?? "N"));
  const [flagPending, setFlagPending] = useState(false);
  const [docs, setDocs] = useState<DocT[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDocsLoading(true);
    fetch(`/api/documents?opportunityId=${opportunityId}`)
      .then((r) => r.json())
      .then((data: { documents?: DocT[]; errorMessage?: string }) => {
        if (!cancelled && data.documents) setDocs(data.documents);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDocsLoading(false); });
    return () => { cancelled = true; };
  }, [opportunityId]);

  async function toggleFlag(field: "flaggedByUser" | "rejectedByUser", current: string) {
    const next = current === "Y" ? "N" : "Y";
    setFlagPending(true);
    const patch: Record<string, string> = { [field]: next };
    if (field === "flaggedByUser" && next === "Y") { patch.rejectedByUser = "N"; setRejected("N"); }
    if (field === "rejectedByUser" && next === "Y") { patch.flaggedByUser = "N"; setFlagged("N"); }
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json() as { flaggedByUser?: string; rejectedByUser?: string; errorMessage?: string };
      if (res.ok && !data.errorMessage) {
        if (data.flaggedByUser) setFlagged(data.flaggedByUser);
        if (data.rejectedByUser) setRejected(data.rejectedByUser);
      }
    } catch { /* ignore */ }
    setFlagPending(false);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const { uploadFile } = await import("@/utils/upload");
      const result = await uploadFile(file);
      if (result.ok) {
        const objectId = (result.jsonData as { objectId?: string }).objectId ?? null;
        if (objectId) {
          await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              objectId,
              opportunityId,
              displayName: file.name,
              documentType: "attachment",
              size: file.size,
            }),
          });
          const res = await fetch(`/api/documents?opportunityId=${opportunityId}`);
          const data = await res.json() as { documents?: DocT[] };
          if (data.documents) setDocs(data.documents);
        }
      }
    } catch { /* ignore */ }
    setUploading(false);
  }

  return (
    <>
      <button className="drawer-scrim" aria-label="Close details" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            <span className="mono muted">{String(row.noticeId ?? "")}</span>
            <h3 id="drawer-title">{String(row.title ?? "")}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>

        <div className="triage">
          <button
            type="button"
            className={`triage-btn${flagged === "Y" ? " active flag" : ""}`}
            disabled={flagPending}
            onClick={() => toggleFlag("flaggedByUser", flagged)}
          >
            <Icon name="plus" size={14} /> {flagged === "Y" ? "Flagged" : "Flag as interesting"}
          </button>
          <button
            type="button"
            className={`triage-btn${rejected === "Y" ? " active reject" : ""}`}
            disabled={flagPending}
            onClick={() => toggleFlag("rejectedByUser", rejected)}
          >
            <Icon name="x" size={14} /> {rejected === "Y" ? "Rejected" : "Reject"}
          </button>
        </div>

        <div className="drawer-links">
          {row.link && <a href={String(row.link)} target="_blank" rel="noreferrer" className="btn quiet">View on SAM.gov <Icon name="external" size={14} /></a>}
          {row.additionalInfoLink && <a href={String(row.additionalInfoLink)} target="_blank" rel="noreferrer" className="btn quiet">Additional info <Icon name="external" size={14} /></a>}
        </div>
        {GROUPS.map((g) => {
          const fields = FIELDS.filter((f) => f.group === g && f.type !== "clob" && f.key !== "link" && f.key !== "additionalInfoLink" && f.key !== "title" && f.key !== "noticeId");
          return (
            <dl className="ledger" key={g} aria-label={g}>
              <div className="ledger-group"><dt>{g}</dt><dd /></div>
              {fields.map((f) => (
                <div key={f.key}><dt>{f.label}</dt><dd>{fmt(f.key, row[f.key])}</dd></div>
              ))}
            </dl>
          );
        })}
        <section className="drawer-desc">
          <h4>Description</h4>
          <p>{row.description ? String(row.description) : "—"}</p>
        </section>

        <section className="drawer-docs">
          <h4>Documents</h4>
          {docsLoading ? (
            <p className="muted">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="muted">No documents attached yet.</p>
          ) : (
            <ul className="doc-list">
              {docs.map((d) => (
                <li key={d.objectId} className="doc-item">
                  <Icon name="evidence" size={14} />
                  <span className="doc-name">{d.displayName}</span>
                  <span className="mono muted">{fmtBytes(d.size)}</span>
                  <span className="mono muted">{d.documentType}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="doc-upload">
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
            <button type="button" className="btn quiet" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} /> {uploading ? "Uploading…" : "Attach a document"}
            </button>
          </div>
        </section>
      </aside>
    </>
  );
}
