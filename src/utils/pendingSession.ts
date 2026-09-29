// A login ICAM accepted but put on hold because the account is at its session
// limit (sessionStatus "session limit"). The held session can still call
// icam/getActiveSessions and icam/abandonForCurrentSession, so we keep its id in
// a short-lived httpOnly cookie while the user decides which session to end.
// The browser never sees the id.

export const PENDING_COOKIE = "heynav.pending";
export const SESSION_COOKIE = "heynav.session";

export type PendingSessionT = { sessionId: string; displayName: string; emailAddress: string | null };

export type ActiveSessionT = {
  sessionId: string;
  clientAddress: string | null;
  userAgent: string | null;
  sessionCreated: number | null; // unix time (seconds)
  lastActivity: number | null;   // unix time (seconds)
};

export const SESSION_LIMIT_STATUS = "session limit";

export const cookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

export function readPending(raw: string | undefined): PendingSessionT | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PendingSessionT;
    return v && typeof v.sessionId === "string" ? v : null;
  } catch {
    return null;
  }
}

/** The session cookie value for a now-active session. */
export function sessionCookieValue(p: PendingSessionT) {
  return JSON.stringify({ sessionId: p.sessionId, displayName: p.displayName, emailAddress: p.emailAddress, signedInAt: new Date().toISOString() });
}
