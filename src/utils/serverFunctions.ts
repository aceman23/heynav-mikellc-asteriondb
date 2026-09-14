"use server";

// Hey Nav server functions, modelled on vm-manager/src/utils/serverFunctions.ts.
// Each function is a Next.js Server Action: the browser calls it over an
// RPC channel, and only this file talks to DbTwig.

import { callDbTwig, dbTwigBaseUrl } from "./dbTwig";
import { createSessionCookie, deleteSessionCookie, getSessionCookie } from "./sessionCookie";
import { evaluateSample, sampleById } from "./opportunitiesSample";
import { effectiveFilters, type QueryT, type QueryResultT, type OpportunityRowT } from "@/app/workspace/opportunities/queryModel";

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
  process.env.DB_TWIG_LOGIN_SETTINGS_API ?? "dgBunker/getLoginPageSettings";

/**
 * Anonymous call made when the login page renders. On cloud-test this is
 * `dgBunker/getLoginPageSettings` (GET). Whatever it returns is passed to the
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

  const response = await callDbTwig<{ errorMessage?: string }>("icam/terminateUserSession", undefined, session.sessionId);
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

// ---- Bid opportunities -----------------------------------------------------
//
// DbTwig service `heyNav` (see db/heynav/). Two calls:
//   POST heyNav/queryBidOpportunities { quick, filters[], sort, dir, page, pageSize }
//        -> { total, page, pageSize, rows: [ {noticeId, title, ...} ] }
//   POST heyNav/getBidOpportunity     { opportunityId } -> full row incl. description
//
// With HEYNAV_SAMPLE_DATA=1 the same query is evaluated in-memory over a
// clearly-marked sample set so the screen can be exercised before the
// service is enrolled.

const SAMPLE_MODE = process.env.HEYNAV_SAMPLE_DATA === "1";
const QUERY_API = process.env.HEYNAV_QUERY_API ?? "heyNav/queryBidOpportunities";
const GET_API = process.env.HEYNAV_GET_OPPORTUNITY_API ?? "heyNav/getBidOpportunity";

export async function queryBidOpportunities(query: QueryT): Promise<QueryResultT> {
  // "in" filters also carry a pre-split values[] array for the SQL side.
  const filters = effectiveFilters(query.filters).map((f) =>
    f.op === "in" ? { ...f, values: (f.value ?? "").split(",").map((v) => v.trim()).filter(Boolean) } : f,
  );
  const request = {
    quick: query.quick.trim() || undefined,
    filters,
    sort: query.sort,
    dir: query.dir,
    page: query.page,
    pageSize: query.pageSize,
  };

  if (SAMPLE_MODE) {
    console.log("[opportunities] sample mode —", JSON.stringify(request));
    const { rows, total } = evaluateSample(query, filters);
    return { rows, total, page: query.page, pageSize: query.pageSize, source: "sample", apiCall: QUERY_API };
  }

  const session = await getSessionCookie();
  const response = await callDbTwig<{ rows?: OpportunityRowT[]; total?: number; errorMessage?: string }>(QUERY_API, request, session?.sessionId);
  if (!response.ok) {
    return {
      rows: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      source: "dbtwig",
      apiCall: QUERY_API,
      httpStatus: response.httpStatus,
      errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}`,
    };
  }
  return {
    rows: response.jsonData.rows ?? [],
    total: response.jsonData.total ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    source: "dbtwig",
    apiCall: QUERY_API,
  };
}

export async function getBidOpportunity(opportunityId: number): Promise<{ row: OpportunityRowT | null; errorMessage?: string }> {
  if (SAMPLE_MODE) return { row: sampleById(opportunityId) };
  const session = await getSessionCookie();
  const response = await callDbTwig<OpportunityRowT & { errorMessage?: string }>(GET_API, { opportunityId }, session?.sessionId);
  if (!response.ok) return { row: null, errorMessage: String(response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}`) };
  return { row: response.jsonData };
}
