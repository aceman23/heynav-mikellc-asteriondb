// Hey Nav server functions, modelled on vm-manager/src/utils/serverFunctions.ts.
// These are plain server-side functions called from Server Components and
// route handlers — not Server Actions. Browser interactions go through
// the route handlers under /api/.

import { callDbTwig, dbTwigBaseUrl } from "./dbTwig";
import { getSessionCookie } from "./sessionCookie";
import { evaluateSample, sampleSetFlags, sampleGetDocuments, sampleAttachDocument, sampleAskQuestion, type SampleDocumentT } from "./opportunitiesSample";
import { effectiveFilters, type QueryT, type QueryResultT, type OpportunityRowT } from "@/app/workspace/opportunities/queryModel";
import { evaluateRows, extractRows, normalizeRow, presentKeys } from "./opportunityQuery";
import { sampleById } from "./opportunitiesSample";

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

// Query modes:
//   sample — HEYNAV_SAMPLE_DATA=1: in-memory over sample rows
//   basic  — HEYNAV_QUERY_MODE=basic: fetch every row from HEYNAV_LIST_API
//            (heyNav/getBidOpportunities, no parameters) and filter/sort/page in the app
//   full   — default: POST HEYNAV_QUERY_API with the query; the database does the work
const QUERY_MODE: "sample" | "basic" | "full" = SAMPLE_MODE ? "sample" : process.env.HEYNAV_QUERY_MODE === "basic" ? "basic" : "full";
const LIST_API = process.env.HEYNAV_LIST_API ?? "heyNav/getBidOpportunities";
const GET_OPPORTUNITY_API = process.env.HEYNAV_GET_OPPORTUNITY_API ?? "heyNav/getBidOpportunity";
const QUERY_API = process.env.HEYNAV_QUERY_API ?? "heyNav/queryBidOpportunities";

/** basic mode: fetch and normalize every row the list entry point returns. */
async function fetchAllOpportunities(): Promise<{ rows: OpportunityRowT[]; raw: unknown; ok: boolean; httpStatus: number; errorMessage?: string }> {
  const session = await getSessionCookie();
  if (!session?.sessionId) return { rows: [], raw: null, ok: false, httpStatus: 401, errorMessage: "Your session has expired. Sign in again." };
  const response = await callDbTwig<unknown>(LIST_API, undefined, session.sessionId);
  if (!response.ok) {
    const err = (response.jsonData as { errorMessage?: string } | null)?.errorMessage;
    return { rows: [], raw: response.jsonData, ok: false, httpStatus: response.httpStatus, errorMessage: err ?? `HTTP ${response.httpStatus}` };
  }
  const rawRows = extractRows(response.jsonData);
  const rows = rawRows.map(normalizeRow);
  console.log(`[opportunities] basic mode — ${LIST_API} returned ${rawRows.length} rows; keys: ${presentKeys(rows).join(", ") || "(none matched the catalog)"}`);
  if (rawRows[0]) console.log("[opportunities] first raw row:", JSON.stringify(rawRows[0]).slice(0, 600));
  return { rows, raw: response.jsonData, ok: true, httpStatus: response.httpStatus };
}

/** Diagnostic: the list entry point's raw response, for checking the shape. */
export async function getRawOpportunitiesPayload() {
  return fetchAllOpportunities();
}

/** One opportunity, mode-aware: sample rows, the basic-mode list, or the entry point. */
export async function getBidOpportunity(opportunityId: number): Promise<{ jsonData: OpportunityRowT | { errorMessage: string }; ok: boolean; httpStatus: number }> {
  if (QUERY_MODE === "sample") {
    const row = sampleById(opportunityId);
    return row ? { jsonData: row, ok: true, httpStatus: 200 } : { jsonData: { errorMessage: "Opportunity not found." }, ok: false, httpStatus: 404 };
  }
  if (QUERY_MODE === "basic") {
    const all = await fetchAllOpportunities();
    if (!all.ok) return { jsonData: { errorMessage: all.errorMessage ?? "Could not load opportunities." }, ok: false, httpStatus: all.httpStatus };
    const row = all.rows.find((r) => Number(r.opportunityId) === opportunityId);
    return row ? { jsonData: row, ok: true, httpStatus: 200 } : { jsonData: { errorMessage: "Opportunity not found in the current list." }, ok: false, httpStatus: 404 };
  }
  const session = await getSessionCookie();
  if (!session?.sessionId) return { jsonData: { errorMessage: "Your session has expired. Sign in again." }, ok: false, httpStatus: 401 };
  const response = await callDbTwig<OpportunityRowT & { errorMessage?: string }>(GET_OPPORTUNITY_API, { opportunityId }, session.sessionId);
  return { jsonData: response.jsonData, ok: response.ok, httpStatus: response.httpStatus };
}

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

  if (QUERY_MODE === "basic") {
    const all = await fetchAllOpportunities();
    if (!all.ok) {
      return { rows: [], total: 0, page: query.page, pageSize: query.pageSize, source: "basic", apiCall: LIST_API, httpStatus: all.httpStatus, errorMessage: all.errorMessage };
    }
    const { rows, total } = evaluateRows(all.rows, query, filters);
    return { rows, total, page: query.page, pageSize: query.pageSize, source: "basic", apiCall: LIST_API, availableKeys: presentKeys(all.rows) };
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

// ---- Triage flags ----------------------------------------------------------

const SET_FLAGS_API = process.env.HEYNAV_SET_FLAGS_API ?? "heyNav/setOpportunityFlags";

export type FlagResultT = {
  opportunityId: number;
  flaggedByUser: string;
  rejectedByUser: string;
  errorMessage?: string;
};

export async function setOpportunityFlags(
  opportunityId: number,
  flags: { flaggedByUser?: string; rejectedByUser?: string },
): Promise<FlagResultT> {
  if (SAMPLE_MODE) {
    const result = sampleSetFlags(opportunityId, flags);
    if (!result) return { opportunityId, flaggedByUser: "N", rejectedByUser: "N", errorMessage: "Opportunity not found." };
    return result;
  }
  const session = await getSessionCookie();
  const response = await callDbTwig<FlagResultT & { errorMessage?: string }>(
    SET_FLAGS_API,
    { opportunityId, ...flags },
    session?.sessionId,
  );
  if (!response.ok) {
    return { opportunityId, flaggedByUser: "N", rejectedByUser: "N", errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` };
  }
  return response.jsonData;
}

// ---- Documents -------------------------------------------------------------

export type DocumentT = SampleDocumentT;

const ATTACH_DOCUMENT_API = process.env.HEYNAV_ATTACH_DOCUMENT_API ?? "heyNav/attachDocument";
const GET_DOCUMENTS_API = process.env.HEYNAV_GET_DOCUMENTS_API ?? "heyNav/getDocuments";

export async function attachDocument(params: {
  objectId: string;
  opportunityId: number | null;
  displayName: string;
  documentType: string;
  size: number;
}): Promise<DocumentT & { errorMessage?: string }> {
  if (SAMPLE_MODE) {
    return sampleAttachDocument(params);
  }
  const session = await getSessionCookie();
  const response = await callDbTwig<DocumentT & { errorMessage?: string }>(
    ATTACH_DOCUMENT_API,
    params,
    session?.sessionId,
  );
  return response.jsonData;
}

export async function getDocuments(opportunityId: number | null): Promise<{ documents: DocumentT[]; errorMessage?: string }> {
  if (SAMPLE_MODE) {
    return { documents: sampleGetDocuments(opportunityId) };
  }
  const session = await getSessionCookie();
  const response = await callDbTwig<{ documents?: DocumentT[]; errorMessage?: string }>(
    GET_DOCUMENTS_API,
    { opportunityId },
    session?.sessionId,
  );
  if (!response.ok) {
    return { documents: [], errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` };
  }
  return { documents: response.jsonData.documents ?? [] };
}

// ---- Ask (RAG) -------------------------------------------------------------

const ASK_API = process.env.HEYNAV_ASK_API ?? "heyNav/askQuestion";

export type CitationT = {
  objectId: string;
  displayName: string;
  snippet: string;
};

export type AskResultT = {
  answer: string;
  citations: CitationT[];
  errorMessage?: string;
};

export async function askQuestion(question: string, opportunityId: number | null): Promise<AskResultT> {
  if (SAMPLE_MODE) {
    return sampleAskQuestion(question, opportunityId);
  }
  const session = await getSessionCookie();
  const response = await callDbTwig<AskResultT & { errorMessage?: string }>(
    ASK_API,
    { question, opportunityId },
    session?.sessionId,
  );
  if (!response.ok) {
    return { answer: "", citations: [], errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` };
  }
  return response.jsonData;
}
