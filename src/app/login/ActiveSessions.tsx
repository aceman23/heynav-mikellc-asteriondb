"use client";

import { useState } from "react";
import type { ActiveSessionT } from "@/utils/pendingSession";

// Shown in place of the sign-in form when ICAM reports the account is at its
// session limit. Lists the other active sessions; ending one signs this login in.

function when(unix: number | null): string {
  if (!unix) return "—";
  const ms = unix < 1e12 ? unix * 1000 : unix;
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(ms).toLocaleString();
}

function device(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Postman/i.test(ua) ? "Postman" : /node|undici/i.test(ua) ? "Server app" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function ActiveSessions({
  initial,
  onSignedIn,
  onCancel,
}: {
  initial: ActiveSessionT[];
  onSignedIn: () => void;
  onCancel: () => void;
}) {
  const [sessions, setSessions] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/login/sessions");
    const data = (await r.json().catch(() => ({}))) as { activeSessions?: ActiveSessionT[]; errorMessage?: string };
    if (r.ok) setSessions(data.activeSessions ?? []);
    else setError(data.errorMessage ?? `HTTP ${r.status}`);
  }

  async function end(sessionId: string) {
    setBusy(sessionId);
    setError(null);
    console.log("[login] end other session →", sessionId.slice(0, 8));
    const r = await fetch("/api/login/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToTerminate: sessionId }),
    });
    const data = (await r.json().catch(() => ({}))) as { errorMessage?: string };
    console.log("[login] end other session ←", r.status, data);
    setBusy(null);
    if (r.ok) return onSignedIn();
    setError(data.errorMessage ?? `HTTP ${r.status}`);
    if (r.status === 401) return;
    refresh();
  }

  async function cancel() {
    setBusy("cancel");
    await fetch("/api/login/sessions", { method: "DELETE" }).catch(() => {});
    setBusy(null);
    onCancel();
  }

  return (
    <div className="sessions" role="region" aria-labelledby="sessions-title">
      <div className="sessions-alert" role="alert">
        <strong id="sessions-title">You&apos;re already signed in elsewhere</strong>
        <p>
          This account has reached its limit of active sessions. Sign out one of the sessions below to continue here,
          or cancel and leave everything as it is.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="muted">No other active sessions were found. <button type="button" className="link-btn" onClick={refresh}>Check again</button></p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.sessionId} className="session-card">
              <div className="session-main">
                <span className="session-device">{device(s.userAgent)}</span>
                <span className="session-meta">
                  {s.clientAddress ?? "unknown address"} · started {when(s.sessionCreated)} · last active {when(s.lastActivity)}
                </span>
              </div>
              <button type="button" className="btn quiet session-end" disabled={busy !== null} onClick={() => end(s.sessionId)}>
                {busy === s.sessionId ? "Signing out…" : "Sign out & continue"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="error">{error}</div>}

      <button type="button" className="link-btn sessions-cancel" disabled={busy !== null} onClick={cancel}>
        {busy === "cancel" ? "Cancelling…" : "Cancel — don't sign in here"}
      </button>
    </div>
  );
}
