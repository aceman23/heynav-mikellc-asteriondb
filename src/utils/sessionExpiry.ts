// Recognising a dead DbTwig session.
//
// DbTwig answers HTTP 403 with { status: false, errorCode: 20002,
// errorMessage: "ORA-20002 … This session has timed out …" } once the ICAM
// session behind our cookie has expired. The cookie is then useless, so the
// right response everywhere is: clear it and go back to sign-in.

export const SESSION_EXPIRED_ERROR_CODE = 20002;

export function isSessionExpired(httpStatus: number, jsonData: unknown): boolean {
  if (httpStatus !== 403) return false;
  const d = (jsonData ?? {}) as { errorCode?: number; errorMessage?: string };
  return d.errorCode === SESSION_EXPIRED_ERROR_CODE || /session has timed out/i.test(d.errorMessage ?? "");
}

/** Client side: send the browser to /logout, which clears the cookie and explains why. */
export function redirectIfSessionExpired(status: number, jsonData: unknown): boolean {
  if (typeof window === "undefined" || !isSessionExpired(status, jsonData)) return false;
  console.warn("[session] DbTwig session expired — redirecting to /logout");
  window.location.assign("/logout?reason=expired");
  return true;
}
