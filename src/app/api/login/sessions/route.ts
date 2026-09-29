import { NextResponse, type NextRequest } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import {
  PENDING_COOKIE, SESSION_COOKIE, cookieOptions, readPending, sessionCookieValue, type ActiveSessionT,
} from "@/utils/pendingSession";

// Session-limit resolution for a held login (see /api/login).
//   GET    → the user's other active sessions      (icam/getActiveSessions)
//   POST   { sessionToTerminate } → end that one and sign in (icam/abandonForCurrentSession)
//   DELETE → give up; release the held session     (icam/terminateUserSession)

const NO_PENDING = { errorMessage: "That sign-in has expired. Sign in again." };

export async function GET(request: NextRequest) {
  const pending = readPending(request.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) return NextResponse.json(NO_PENDING, { status: 401 });
  const r = await callDbTwig<{ activeSessions?: ActiveSessionT[] }>("icam/getActiveSessions", undefined, pending.sessionId);
  return NextResponse.json(r.ok ? { activeSessions: r.jsonData?.activeSessions ?? [] } : r.jsonData, { status: r.httpStatus || 502 });
}

export async function POST(request: NextRequest) {
  const pending = readPending(request.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) return NextResponse.json(NO_PENDING, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { sessionToTerminate?: unknown };
  const sessionToTerminate = typeof body.sessionToTerminate === "string" ? body.sessionToTerminate : "";
  if (!/^[0-9A-Fa-f]{16,64}$/.test(sessionToTerminate)) {
    return NextResponse.json({ errorMessage: "Choose a session to sign out." }, { status: 400 });
  }

  console.log(`[login] abandonForCurrentSession → ending ${sessionToTerminate.slice(0, 8)}…`);
  const r = await callDbTwig<{ sessionStatus?: string; errorMessage?: string }>(
    "icam/abandonForCurrentSession", { sessionToTerminate }, pending.sessionId,
  );
  if (!r.ok || String(r.jsonData?.sessionStatus ?? "").toLowerCase() !== "active") {
    return NextResponse.json(
      { errorMessage: r.jsonData?.errorMessage ?? "The other session could not be signed out. Try another, or sign in again." },
      { status: r.ok ? 409 : r.httpStatus || 502 },
    );
  }

  const res = NextResponse.json({ ok: true, sessionStatus: "active" });
  res.cookies.set(SESSION_COOKIE, sessionCookieValue(pending), cookieOptions());
  res.cookies.delete(PENDING_COOKIE);
  console.log(`[cookie] set ${SESSION_COOKIE} for ${pending.displayName} (after ending another session)`);
  return res;
}

export async function DELETE(request: NextRequest) {
  const pending = readPending(request.cookies.get(PENDING_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PENDING_COOKIE);
  if (pending) {
    const r = await callDbTwig("icam/terminateUserSession", undefined, pending.sessionId);
    console.log(`[login] released held session → HTTP ${r.httpStatus}`);
  }
  return res;
}
