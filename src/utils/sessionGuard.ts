import { redirect } from "next/navigation";
import { isSessionExpired } from "./sessionExpiry";

// Server side (page components): a page that calls DbTwig while rendering checks
// each result with this, so a refresh after the session times out goes to
// /logout?reason=expired (which clears the cookie) instead of rendering an error.
// Route handlers must not use it: their callers expect JSON, and the client
// redirects with redirectIfSessionExpired.
export function redirectIfSessionExpiredOnServer(...results: { httpStatus?: number; ok?: boolean; jsonData?: unknown; errorMessage?: string }[]) {
  for (const r of results) {
    if (!r || r.ok) continue;
    const body = r.jsonData ?? { errorMessage: r.errorMessage };
    if (isSessionExpired(r.httpStatus ?? 0, body)) {
      console.warn(`[session] DbTwig session expired (HTTP ${r.httpStatus}) — redirecting to /logout`);
      redirect("/logout?reason=expired");
    }
  }
}
