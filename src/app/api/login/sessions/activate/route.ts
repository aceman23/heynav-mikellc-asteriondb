import { NextResponse, type NextRequest } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import {
  PENDING_COOKIE, SESSION_COOKIE, cookieOptions, readPending, sessionCookieValue,
} from "@/utils/pendingSession";
// POST /api/login/sessions/activate → icam/activateBlockedSession (no parameters).
//
// For a login held at the session limit, after the user has signed out on their
// other device themselves. ICAM finds the held session from the Bearer token and
// re-checks the limit:
//   sessionStatus "active"        → signed in here
//   sessionStatus "session limit" → still at the limit (the other device is still signed in)
//   error                         → the held session timed out or was ended; sign in again
export async function POST(request: NextRequest) {
  const pending = readPending(request.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json({ errorMessage: "That sign-in has expired. Sign in again." }, { status: 401 });
  }
  console.log("[login] activateBlockedSession →");
  const r = await callDbTwig<{ sessionStatus?: string; errorMessage?: string }>(
    "icam/activateBlockedSession", undefined, pending.sessionId,
  );
  const status = String(r.jsonData?.sessionStatus ?? "").toLowerCase();
  console.log(`[login] activateBlockedSession ← HTTP ${r.httpStatus} sessionStatus=${status || "(none)"}`);
  if (r.ok && status === "active") {
    const res = NextResponse.json({ ok: true, sessionStatus: "active" });
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(pending), cookieOptions());
    res.cookies.delete(PENDING_COOKIE);
    console.log(`[cookie] set ${SESSION_COOKIE} for ${pending.displayName} (blocked session activated)`);
    return res;
  }
  if (r.ok) {
    return NextResponse.json(
      {
        stillBlocked: true,
        sessionStatus: status,
        errorMessage: "You're still at your session limit. Sign out on your other device first, then try again.",
      },
      { status: 409 },
    );
  }
  // Service unreachable or failing: keep the held login so the user can retry.
  if (!r.httpStatus || r.httpStatus >= 500) {
    return NextResponse.json(
      { errorMessage: "The sign-in service could not be reached. Try again." },
      { status: 502 },
    );
  }
  // ICAM ends the held session when it has timed out or its address or browser
  // no longer match, so this login can't continue.
  const res = NextResponse.json(
    { errorMessage: r.jsonData?.errorMessage ?? "This sign-in could not be activated. Sign in again." },
    { status: 401 },
  );
  res.cookies.delete(PENDING_COOKIE);
  return res;
}
