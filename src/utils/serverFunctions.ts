"use server";

// Hey Nav server functions, modelled on vm-manager/src/utils/serverFunctions.ts.
// Each function is a Next.js Server Action: the browser calls it over an
// RPC channel, and only this file talks to DbTwig.

import { callDbTwig, dbTwigBaseUrl } from "./dbTwig";
import { createSessionCookie, deleteSessionCookie, getSessionCookie } from "./sessionCookie";
import type { ServerResponseT, UserSessionT } from "./types";

export type { ServerResponseT, UserSessionT, SessionSummaryT } from "./types";

/**
 * POST icam/createUserSession { identification, password }
 * On success the sessionId is stored in the httpOnly cookie and NOT returned
 * to the browser.
 */
export async function createUserSession(
  identification: string,
  password: string,
): Promise<ServerResponseT<Omit<UserSessionT, "sessionId">>> {
  const response = await callDbTwig<UserSessionT>("icam/createUserSession", {
    body: { identification, password },
  });

  const { sessionId, ...publicData } = response.jsonData ?? ({} as UserSessionT);

  if (response.ok && sessionId) {
    const displayName =
      [publicData.firstName, publicData.lastName].filter(Boolean).join(" ") || identification;
    await createSessionCookie({
      sessionId,
      displayName,
      emailAddress: publicData.emailAddress ?? null,
      signedInAt: new Date().toISOString(),
    });
  }

  return { jsonData: publicData, ok: response.ok, httpStatus: response.httpStatus };
}

/**
 * GET icam/terminateUserSession with the Bearer session token.
 * The cookie is always cleared afterwards: if DbTwig rejected the token, the
 * session is already dead on the server side and keeping the cookie would
 * only trap the user in a 403 loop.
 */
export async function terminateUserSession(): Promise<
  ServerResponseT<{ errorMessage?: string }> & { hadSession: boolean; dataLayer: string }
> {
  const session = await getSessionCookie();
  const dataLayer = dbTwigBaseUrl();

  if (undefined === session) {
    console.log("[icam] terminateUserSession skipped — no session cookie present");
    return { jsonData: {}, ok: true, httpStatus: 204, hadSession: false, dataLayer };
  }

  const response = await callDbTwig<{ errorMessage?: string }>("icam/terminateUserSession", {
    sessionId: session.sessionId,
  });
  await deleteSessionCookie();
  return { ...response, hadSession: true, dataLayer };
}
