"use server";

// Hey Nav server functions, modelled on vm-manager/src/utils/serverFunctions.ts.
// Each function is a Next.js Server Action: the browser calls it over an
// RPC channel, and only this file talks to DbTwig.

import { callDbTwig, dbTwigBaseUrl } from "./dbTwig";
import { createSessionCookie, deleteSessionCookie, getSessionCookie } from "./sessionCookie";

export type ServerResponseT<T = Record<string, unknown>> = {
  jsonData: T;
  ok: boolean;
  httpStatus: number;
};

// Shape observed on cloud-test for icam/createUserSession.
export type UserSessionT = {
  sessionId: string;
  sessionStatus: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  errorMessage?: string;
};

// What the browser is allowed to know about a session. No sessionId.
export type SessionSummaryT = {
  displayName: string;
  emailAddress: string | null;
  signedInAt: string;
};

const LOGIN_SETTINGS_API =
  process.env.DB_TWIG_LOGIN_SETTINGS_API ?? "dbBunker/getLoginPageSettings";

/**
 * Anonymous call made when the login page renders. On cloud-test this is
 * `dbBunker/getLoginPageSettings` (GET). Whatever it returns is passed to the
 * page and printed in the console so the payload shape is easy to inspect.
 */
export async function getLoginPageSettings(): Promise<
  ServerResponseT<Record<string, unknown>> & { dataLayer: string; apiCall: string }
> {
  const response = await callDbTwig<Record<string, unknown>>(LOGIN_SETTINGS_API);
  return { ...response, dataLayer: dbTwigBaseUrl(), apiCall: LOGIN_SETTINGS_API };
}

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
    identification,
    password,
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

  const response = await callDbTwig<{ errorMessage?: string }>("icam/terminateUserSession");
  await deleteSessionCookie();
  return { ...response, hadSession: true, dataLayer };
}

/** Browser-safe view of the current session, for headers and status panels. */
export async function getSessionSummary(): Promise<SessionSummaryT | null> {
  const session = await getSessionCookie();
  if (undefined === session) return null;
  return {
    displayName: session.displayName,
    emailAddress: session.emailAddress,
    signedInAt: session.signedInAt,
  };
}
