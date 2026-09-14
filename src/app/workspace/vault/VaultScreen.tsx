"use client";

import { useState } from "react";
import { UploadDropzone, objectIdFrom, type UploadItemT } from "../components/UploadDropzone";

// Vault: put documents into the bunker. Listing and retrieval land once the
// dgBunker read APIs are wired (see README); until then this page shows what
// was stored in this session.
export function VaultScreen() {
  const [stored, setStored] = useState<UploadItemT[]>([]);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Vault</h2>
          <p>Solicitations, attachments, past performance, and anything else with CUI in it go here — as governed database objects, not files on a share.</p>
        </div>
      </div>

      <section className="panel">
        <h3>Upload to the bunker</h3>
        <UploadDropzone onUploaded={(item) => setStored((s) => [item, ...s])} />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Stored this session</h3>
        {stored.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Objects you upload will be listed here with the object id the bunker assigned.</p>
        ) : (
          <dl className="ledger">
            {stored.map((it) => (
              <div key={it.id}>
                <dt>{it.file.name}</dt>
                <dd className="mono">{objectIdFrom(it.result!.jsonData) ?? JSON.stringify(it.result!.jsonData).slice(0, 120)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>
  );
}
