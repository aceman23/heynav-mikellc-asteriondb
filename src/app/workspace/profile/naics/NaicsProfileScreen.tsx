"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "../../Icon";
import { redirectIfSessionExpired } from "@/utils/sessionExpiry";
import type { NaicsSectorT, NaicsCodeT, NaicsCodeDetailT, ProfileNaicsT } from "@/utils/serverFunctions";

// Onboarding: pick your sector(s), tick the codes you actually work in, expand a
// code to check its index entries, save. The saved set becomes the "My NAICS"
// preset on the Opportunities screen.

export function NaicsProfileScreen({ sectors, saved, loadError }: { sectors: NaicsSectorT[]; saved: ProfileNaicsT[]; loadError: string | null }) {
  const [selected, setSelected] = useState<Map<number, ProfileNaicsT>>(new Map(saved.map((c) => [c.naicsCodeId, c])));
  const [openSectors, setOpenSectors] = useState<string[]>(() => Array.from(new Set(saved.map((c) => c.sectorCode))));
  const [codesBySector, setCodesBySector] = useState<Record<string, NaicsCodeT[] | "loading" | { error: string }>>({});
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<Record<number, NaicsCodeDetailT | "loading" | { error: string }>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = useMemo(() => {
    const a = Array.from(selected.keys()).sort().join(",");
    const b = saved.map((c) => c.naicsCodeId).sort().join(",");
    return a !== b;
  }, [selected, saved]);

  async function loadSector(sectorCode: string) {
    if (codesBySector[sectorCode]) return;
    setCodesBySector((m) => ({ ...m, [sectorCode]: "loading" }));
    const r = await fetch(`/api/naics/sectors/${sectorCode}`);
    const data = (await r.json().catch(() => ({}))) as { naicsBySector?: NaicsCodeT[]; errorMessage?: string };
    if (redirectIfSessionExpired(r.status, data)) return;
    console.log("[naics] getNaicsBySector", sectorCode, "←", r.status, data.naicsBySector?.length ?? data.errorMessage);
    setCodesBySector((m) => ({ ...m, [sectorCode]: r.ok && data.naicsBySector ? data.naicsBySector.map((c) => ({ ...c, title: c.title.trim() })) : { error: data.errorMessage ?? `HTTP ${r.status}` } }));
  }

  function toggleSector(sectorCode: string) {
    setOpenSectors((s) => (s.includes(sectorCode) ? s.filter((x) => x !== sectorCode) : [...s, sectorCode]));
    loadSector(sectorCode);
  }

  function toggleCode(sectorCode: string, c: NaicsCodeT) {
    setSelected((m) => {
      const next = new Map(m);
      if (next.has(c.naicsCodeId)) next.delete(c.naicsCodeId);
      else next.set(c.naicsCodeId, { naicsCodeId: c.naicsCodeId, naicsCode: c.naicsCode, title: c.title.trim(), sectorCode });
      return next;
    });
    setSaveMsg(null);
  }

  async function showDetail(id: number) {
    setExpanded((e) => (e === id ? null : id));
    if (detail[id]) return;
    setDetail((d) => ({ ...d, [id]: "loading" }));
    const r = await fetch(`/api/naics/codes/${id}`);
    const data = (await r.json().catch(() => ({}))) as NaicsCodeDetailT & { errorMessage?: string };
    if (redirectIfSessionExpired(r.status, data)) return;
    setDetail((d) => ({ ...d, [id]: r.ok && data.descriptions ? data : { error: data.errorMessage ?? `HTTP ${r.status}` } }));
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    const naicsCodes = Array.from(selected.values());
    console.log("[profile →] save", naicsCodes.map((c) => c.naicsCode));
    const r = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naicsCodes }) });
    const data = (await r.json().catch(() => ({}))) as { errorMessage?: string };
    if (redirectIfSessionExpired(r.status, data)) return;
    setSaving(false);
    setSaveMsg(r.ok ? { ok: true, text: `Saved ${naicsCodes.length} code${naicsCodes.length === 1 ? "" : "s"} to your profile.` } : { ok: false, text: data.errorMessage ?? `HTTP ${r.status}` });
    if (r.ok) window.location.reload();
  }

  const needle = filter.trim().toUpperCase();
  const matches = (c: NaicsCodeT) => !needle || c.naicsCode.startsWith(needle) || c.title.toUpperCase().includes(needle);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Your NAICS codes</h2>
          <p>Pick the sectors you work in, then tick the specific codes. Expand a code to see the index entries the Census Bureau files under it and confirm it fits. Saved codes become your default "My NAICS" filter on Opportunities.</p>
        </div>
      </div>

      {loadError && <div className="error">{loadError}<span className="code">heyNav/getNaicsSectors</span></div>}

      <div className="naics-layout">
        <section className="panel naics-sectors" aria-label="Sectors">
          <h3>Sectors</h3>
          <ul>
            {sectors.map((s) => {
              const open = openSectors.includes(s.sectorCode);
              const count = Array.from(selected.values()).filter((c) => c.sectorCode === s.sectorCode).length;
              return (
                <li key={s.sectorCode}>
                  <button type="button" className={`sector-btn${open ? " open" : ""}`} onClick={() => toggleSector(s.sectorCode)} aria-expanded={open} title={s.description}>
                    <span className="mono">{s.sectorCode}</span>
                    <span className="sector-name">{s.sector}</span>
                    {count > 0 && <span className="count">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel naics-codes" aria-label="Codes">
          <div className="naics-codes-head">
            <h3>Codes</h3>
            <div className="control">
              <Icon name="search" />
              <input type="search" placeholder="Filter by code or title" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter codes" />
            </div>
          </div>

          {openSectors.length === 0 && <p className="muted">Choose a sector on the left to see its codes.</p>}

          {openSectors.map((sc) => {
            const sector = sectors.find((s) => s.sectorCode === sc);
            const state = codesBySector[sc];
            return (
              <div className="sector-block" key={sc}>
                <h4><span className="mono">{sc}</span> {sector?.sector ?? sc}</h4>
                {!state || state === "loading" ? (
                  <p className="muted">Loading codes…</p>
                ) : "error" in state ? (
                  <div className="error">{state.error}<span className="code">heyNav/getNaicsBySector</span></div>
                ) : state.filter(matches).length === 0 ? (
                  <p className="muted">No codes match.</p>
                ) : (
                  <ul className="code-list">
                    {state.filter(matches).map((c) => {
                      const on = selected.has(c.naicsCodeId);
                      const d = detail[c.naicsCodeId];
                      return (
                        <li key={c.naicsCodeId} className={on ? "on" : ""}>
                          <label className="code-row">
                            <input type="checkbox" checked={on} onChange={() => toggleCode(sc, c)} />
                            <span className="mono code-num">{c.naicsCode}</span>
                            <span className="code-title">{c.title.trim()}</span>
                            <button type="button" className="link-btn" onClick={(e) => { e.preventDefault(); showDetail(c.naicsCodeId); }} aria-expanded={expanded === c.naicsCodeId}>
                              {expanded === c.naicsCodeId ? "Hide" : "What's in it?"}
                            </button>
                          </label>
                          {expanded === c.naicsCodeId && (
                            <div className="code-detail">
                              {!d || d === "loading" ? <p className="muted">Loading…</p>
                                : "error" in d ? <div className="error">{d.error}</div>
                                : d.descriptions.length === 0 ? <p className="muted">No index entries recorded.</p>
                                : <ul>{d.descriptions.map((x) => <li key={x.descriptionId}>{x.description}</li>)}</ul>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <div className="naics-bar" role="region" aria-label="Selection">
        <div>
          <strong>{selected.size}</strong> code{selected.size === 1 ? "" : "s"} selected
          {selected.size > 0 && <span className="muted"> · {Array.from(selected.values()).map((c) => c.naicsCode).sort().join(", ")}</span>}
          {saveMsg && <span className={`status ${saveMsg.ok ? "ok" : "bad"}`} style={{ marginLeft: 12 }}>{saveMsg.text}</span>}
        </div>
        <div className="naics-bar-actions">
          {dirty && <button type="button" className="link-btn" onClick={() => window.location.reload()}>Discard changes</button>}
          {!dirty && saved.length > 0 && <Link href="/workspace/opportunities?preset=mynaics" className="btn quiet">See matching opportunities</Link>}
          <button type="button" className="btn primary" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save to profile"}</button>
        </div>
      </div>
    </>
  );
}
