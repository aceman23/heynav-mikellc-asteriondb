// Server-only queries called from Server Components (page.tsx / layout.tsx).
// These must NOT live in a "use server" module: that directive turns every
// export into a remote Server Action, which breaks cookies() access when
// called from a Server Component's render pass.

import { cookies } from "next/headers";
import { callDbTwig, dbTwigBaseUrl } from "./dbTwig";
import type { SessionCookieT, SessionSummaryT, ServerResponseT } from "./types";

const SESSION_COOKIE = "heynav.session";

const LOGIN_SETTINGS_API =
  process.env.DB_TWIG_LOGIN_SETTINGS_API ?? "dgBunker/getLoginPageSettings";

export async function getLoginPageSettings(): Promise<
  ServerResponseT<Record<string, unknown>> & { dataLayer: string; apiCall: string }
> {
  const response = await callDbTwig<Record<string, unknown>>(LOGIN_SETTINGS_API);
  return { ...response, dataLayer: dbTwigBaseUrl(), apiCall: LOGIN_SETTINGS_API };
}

export async function getSessionSummary(): Promise<SessionSummaryT | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE);
  if (!raw || "" === raw.value) return null;
  try {
    const session = JSON.parse(raw.value) as SessionCookieT;
    return {
      displayName: session.displayName,
      emailAddress: session.emailAddress,
      signedInAt: session.signedInAt,
    };
  } catch {
    return null;
  }
}
