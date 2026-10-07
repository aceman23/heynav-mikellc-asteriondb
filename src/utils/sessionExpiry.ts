// Recognising a dead DbTwig session.
//
// ICAM checks the session on every call. The first call after the idle limit gets
// HTTP 403 { errorCode: 20002, "This session has timed out" } and ICAM marks the
// session terminated in the same step. Every later call with that session id (a
// page refresh, a second request) gets HTTP 403 { errorCode: 20001, "An unexpected
// session status was encountered" } instead. A session id ICAM doesn't know at all
// gets 20004 "The session ID is invalid" (HTTP 500).
// DbTwig uses 403 only for 20001 and 20002. Any of these means the cookie is useless,
// so the response everywhere is the same: clear it and go back to sign-in.

export const SESSION_EXPIRED_ERROR_CODE = 20002;
export const DEAD_SESSION_ERROR_CODES = [20001, 20002, 20004];
const DEAD_SESSION_MESSAGE = /session has timed out|unexpected session status|session id is invalid/i;

export function isSessionExpired(httpStatus: number, jsonData: unknown): boolean {
  const d = (jsonData ?? {}) as { errorCode?: number | string; errorMessage?: string };
  const code = Math.abs(Number(d.errorCode));
  if (DEAD_SESSION_ERROR_CODES.includes(code)) return true;
  if (DEAD_SESSION_MESSAGE.test(String(d.errorMessage ?? ""))) return true;
  return httpStatus === 403;
}

/** Client side: send the browser to /logout, which clears the cookie and explains why. */
export function redirectIfSessionExpired(status: number, jsonData: unknown): boolean {
  if (typeof window === "undefined" || !isSessionExpired(status, jsonData)) return false;
  console.warn("[session] DbTwig session expired — redirecting to /logout");
  window.location.assign("/logout?reason=expired");
  return true;
}
