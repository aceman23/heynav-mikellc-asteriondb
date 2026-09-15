"use client";

import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { uploadFile, type UploadResultT } from "@/utils/upload";

export type UploadItemT = {
  id: number;
  file: File;
  percent: number;
  status: "queued" | "uploading" | "done" | "failed";
  result?: UploadResultT;
  controller: AbortController;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// dgBunker/uploadFiles returns { objectId } (confirmed). Missing id on a 2xx
// is logged as a warning so a contract drift is visible immediately.
export type UploadResponseT = { objectId: string; errorMessage?: string };

export function objectIdFrom(jsonData: Record<string, unknown>): string | null {
  const id = (jsonData as Partial<UploadResponseT>).objectId;
  if (typeof id === "string" || typeof id === "number") return String(id);
  console.warn("[upload] uploadFiles response has no objectId:", jsonData);
  return null;
}

export function UploadDropzone({
  newVersionOf,
  accept,
  onUploaded,
}: {
  newVersionOf?: string;
  accept?: string;
  onUploaded?: (item: UploadItemT) => void;
}) {
  const [items, setItems] = useState<UploadItemT[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  function update(id: number, patch: Partial<UploadItemT>) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function enqueue(files: FileList | File[]) {
    const fresh: UploadItemT[] = Array.from(files).map((file) => ({
      id: nextId.current++, file, percent: 0, status: "queued", controller: new AbortController(),
    }));
    setItems((list) => [...fresh, ...list]);

    // Sequential, like the reference client's per-file loop.
    for (const item of fresh) {
      update(item.id, { status: "uploading" });
      const result = await uploadFile(item.file, {
        newVersionOf,
        signal: item.controller.signal,
        onProgress: (percent) => update(item.id, { percent }),
      });
      console.log("[upload ←]", result.httpStatus, result.jsonData);
      const done: UploadItemT = { ...item, result, percent: result.ok ? 100 : item.percent, status: result.ok ? "done" : "failed" };
      update(item.id, done);
      if (result.ok) onUploaded?.(done);
    }
  }

  return (
    <div className="upload">
      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        aria-label="Choose files to upload"
      >
        <Icon name="upload" size={22} />
        <strong>{newVersionOf ? "Drop the new version here" : "Drop files here, or click to choose"}</strong>
        <span>Stored as governed objects in the bunker via dgBunker/uploadFiles. Nothing leaves the boundary.</span>
        <input
          ref={inputRef}
          type="file"
          multiple={!newVersionOf}
          accept={accept}
          hidden
          onChange={(e) => { if (e.target.files?.length) enqueue(e.target.files); e.target.value = ""; }}
        />
      </div>

      {items.length > 0 && (
        <ul className="upload-list" aria-label="Uploads">
          {items.map((it) => {
            const objectId = it.result ? objectIdFrom(it.result.jsonData) : null;
            const err = it.result && !it.result.ok ? String(it.result.jsonData.errorMessage ?? `HTTP ${it.result.httpStatus}`) : null;
            return (
              <li key={it.id} className={`upload-item ${it.status}`}>
                <div className="upload-meta">
                  <span className="upload-name">{it.file.name}</span>
                  <span className="mono muted">{fmtBytes(it.file.size)}</span>
                  {it.status === "uploading" && (
                    <button type="button" className="link-btn" onClick={() => it.controller.abort()}>Cancel</button>
                  )}
                </div>
                <div className="upload-bar" aria-hidden="true"><span style={{ width: `${it.percent}%` }} /></div>
                <div className="upload-status">
                  {it.status === "queued" && <span className="status">queued</span>}
                  {it.status === "uploading" && <span className="status warn">uploading · {it.percent}%</span>}
                  {it.status === "done" && <span className="status ok">stored{objectId ? ` · object ${objectId}` : ""}</span>}
                  {it.status === "failed" && <span className="status bad">{err}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
