"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MarkingBar } from "../components/MarkingBar";
import { Wordmark } from "../components/Wordmark";

type EndStateT =
  | { phase: "closing" }
  | { phase: "closed"; hadSession: boolean; httpStatus: number; dataLayer: string; at: string }
  | { phase: "failed"; message: string; httpStatus: number; dataLayer: string; at: string };

// /logout is a real screen: it terminates the DbTwig session on arrival,
// then shows a receipt. Reaching it with no session is a harmless no-op.
export default function LogoutPage() {
  const [state, setState] = useState<EndStateT>({ phase: "closing" });
  const ran = useRef(false); // React strict mode mounts twice in dev
  const [expired, setExpired] = useState(false); // ?reason=expired — set by the app when DbTwig reports a timed-out session

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    setExpired(new URLSearchParams(window.location.search).get("reason") === "expired");

    console.log("[logout] terminateUserSession →");
    fetch("/api/logout", { method: "POST" })
      .then((r) => r.json())
      .then((response) => {
      console.log("[logout] terminateUserSession ←", response.httpStatus, response);
      const at = new Date().toLocaleString();
      if (response.ok || !response.hadSession) {
        setState({ phase: "closed", hadSession: response.hadSession, httpStatus: response.httpStatus, dataLayer: response.dataLayer, at });
      } else {
        setState({
          phase: "failed",
          message: response.jsonData?.errorMessage ?? "The data layer did not confirm the sign-out. Your local session was cleared anyway.",
          httpStatus: response.httpStatus,
          dataLayer: response.dataLayer,
          at,
        });
      }
    });
  }, []);

  const host = state.phase === "closing" ? "" : state.dataLayer.replace(/^https?:\/\//, "");

  return (
    <main className="auth">
      <MarkingBar items={["CUI-aware by design", "Perimeter: customer-controlled", "Session closed"]} />

      <div className="end">
        <div className="end-card">
          <Wordmark href="/login" />

          {state.phase === "closing" && (
            <>
              <h1 style={{ marginTop: 40 }}>Closing your session…</h1>
              <p className="sub">Telling the data layer to end this session and clearing the local cookie.</p>
            </>
          )}

          {state.phase === "closed" && (
            <>
              <h1 style={{ marginTop: 40 }}>{expired ? "Your session timed out." : "You're signed out."}</h1>
              <p className="sub">
                {expired
                  ? "The data layer closed the session after a period of inactivity. Sign in again to pick up where you left off."
                  : state.hadSession
                    ? "The database session was terminated and nothing about it remains in this browser."
                    : "There was no open session in this browser, so there was nothing to close."}
              </p>
            </>
          )}

          {state.phase === "failed" && (
            <>
              <h1 style={{ marginTop: 40 }}>{expired ? "Your session timed out." : "Signed out locally."}</h1>
              {expired ? (
                <p className="sub">The data layer closed the session after a period of inactivity. Sign in again to pick up where you left off.</p>
              ) : (
                <div className="error" role="alert">
                  {state.message}
                  <span className="code">icam/terminateUserSession · HTTP {state.httpStatus || "no response"}</span>
                </div>
              )}
            </>
          )}

          {state.phase !== "closing" && (
            <dl className="ledger" aria-label="Sign-out receipt">
              <div>
                <dt>Data layer</dt>
                <dd>{host}</dd>
              </div>
              <div>
                <dt>Call</dt>
                <dd>
                  <span className={`status ${state.phase === "closed" ? "ok" : "warn"}`}>
                    icam/terminateUserSession · {state.httpStatus === 204 ? "skipped" : `HTTP ${state.httpStatus || "—"}`}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Local cookie</dt>
                <dd>cleared</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{state.at}</dd>
              </div>
            </dl>
          )}

          <div className="actions">
            <Link href="/login" className="btn gold" style={{ marginTop: 0 }}>
              Sign in again
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
