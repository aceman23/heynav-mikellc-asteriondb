import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import type { UserSessionT } from "@/utils/serverFunctions";
import { PENDING_COOKIE, SESSION_LIMIT_STATUS, cookieOptions, type ActiveSessionT } from "@/utils/pendingSession";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const identification = typeof input.identification === "string" ? input.identification.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!identification || !password) {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  const response = await callDbTwig<UserSessionT>("icam/createUserSession", {
    identification,
    password,
  });
  const { sessionId, ...publicData } = response.jsonData ?? ({} as UserSessionT);

  // Only "active" is a signed-in user. "session limit" means the account already
  // has its maximum number of sessions: ICAM holds this one and lets it list the
  // others and end one of them (see /api/login/sessions). Any other status
  // ("change password", "auth code", …) isn't supported yet.
  const status = String(publicData.sessionStatus ?? "").toLowerCase();
  if (response.ok && sessionId && status === SESSION_LIMIT_STATUS) {
    const displayName = [publicData.firstName, publicData.lastName].filter(Boolean).join(" ") || identification;
    const list = await callDbTwig<{ activeSessions?: ActiveSessionT[] }>("icam/getActiveSessions", undefined, sessionId);
    console.warn(`[login] session limit reached — ${list.jsonData?.activeSessions?.length ?? "?"} active session(s); holding new session`);
    const held = NextResponse.json(
      {
        jsonData: {
          sessionStatus: publicData.sessionStatus,
          errorMessage: "You're already signed in elsewhere and this account has reached its session limit.",
          activeSessions: list.ok ? (list.jsonData?.activeSessions ?? []) : [],
        },
        ok: false,
        sessionLimit: true,
        httpStatus: 409,
      },
      { status: 409 },
    );
    held.cookies.set(PENDING_COOKIE, JSON.stringify({ sessionId, displayName, emailAddress: publicData.emailAddress ?? null }), cookieOptions(10 * 60));
    return held;
  }
  if (response.ok && sessionId && status !== "active") {
    console.warn(`[login] icam/createUserSession returned sessionStatus "${publicData.sessionStatus}" — not signing in`);
    const released = await callDbTwig("icam/terminateUserSession", undefined, sessionId);
    console.log(`[login] released non-active session → HTTP ${released.httpStatus}`);
    return NextResponse.json(
      {
        jsonData: {
          sessionStatus: publicData.sessionStatus,
          errorMessage: `Sign-in was not completed: the session status is "${publicData.sessionStatus ?? "unknown"}". Complete it in the AsterionDB console, then try again.`,
        },
        ok: false,
        httpStatus: 403,
      },
      { status: 403 },
    );
  }

  const payload = { jsonData: publicData, ok: response.ok, httpStatus: response.httpStatus };
  const result = NextResponse.json(payload, { status: response.ok ? 200 : response.httpStatus || 502 });

  if (response.ok && sessionId) {
    const displayName =
      [publicData.firstName, publicData.lastName].filter(Boolean).join(" ") || identification;
    result.cookies.set("heynav.session", JSON.stringify({
      sessionId,
      displayName,
      emailAddress: publicData.emailAddress ?? null,
      signedInAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    console.log(`[cookie] set heynav.session for ${displayName}`);
  }

  return result;
}
