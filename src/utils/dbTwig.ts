// Server-only transport for AsterionDB's DbTwig middle tier.
//
// Mirrors vm-manager/src/utils/serverFunctions.ts::callDbTwig from
// https://github.com/JumpinJackFlash/database-os, with one addition: every
// call is traced to the server console so you can watch exactly how the API
// is exercised (method, URL, headers, body, status, timing, payload).
//
// Import this only from server-side code (Server Components, route handlers,
// or server-only modules). It must never be bundled into client components.

export type DbTwigResponseT<T = Record<string, unknown>> = {
  jsonData: T;
  ok: boolean;
  httpStatus: number;
};

const DB_TWIG_URL = (
  process.env.DB_TWIG_URL ?? "https://cloud-test.asteriondb.com/dbTwig"
).replace(/\/+$/, "");

const LOG_SECRETS = process.env.DB_TWIG_LOG_SECRETS === "1";

export function dbTwigBaseUrl() {
  return DB_TWIG_URL;
}

function redact(value: unknown) {
  if (typeof value !== "string" || LOG_SECRETS) return value;
  return value.length > 12 ? value.slice(0, 8) + "…(" + value.length + " chars)" : "…";
}

function forLog(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(forLog);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === "password") out[k] = "•••••••";
      else if (k === "sessionId") out[k] = redact(v);
      else if (k === "Authorization" && typeof v === "string")
        out[k] = v.startsWith("Bearer ") ? "Bearer " + redact(v.slice(7)) : v;
      else out[k] = forLog(v);
    }
    return out;
  }
  return obj;
}

function describeMultipart(fd: FormData) {
  const fields: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    fields[k] = v instanceof File ? `<file ${v.name}, ${v.size} bytes, ${v.type || "unknown type"}>` : String(v);
  }
  return { multipart: fields };
}

export async function callDbTwig<T = Record<string, unknown>>(
  apiCall: string,
  body?: object | FormData,
  sessionId?: string,
): Promise<DbTwigResponseT<T>> {
  // DbTwig validates the session on every call by taking whatever follows
  // "Bearer " and converting it to a RAW session id inside the database.
  // Before login there is no session, so the header must be OMITTED.
  const headers: Record<string, string> = {};
  if (sessionId) headers.Authorization = "Bearer " + sessionId;

  // Multipart bodies (dgBunker/uploadFiles) go out as-is; fetch sets the
  // Content-Type with the boundary. Everything else is JSON.
  const isMultipart = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const requestOptions: RequestInit =
    undefined !== body
      ? { method: "POST", headers, body: isMultipart ? body : JSON.stringify(body), cache: "no-store" }
      : { method: "GET", headers, cache: "no-store" };

  const url = DB_TWIG_URL + "/" + apiCall;
  const startedAt = Date.now();

  console.log(
    `[dbTwig →] ${requestOptions.method} ${url}`,
    JSON.stringify(
      { auth: sessionId ? "bearer session" : "anonymous (no Authorization header)", headers: forLog(headers), body: isMultipart ? describeMultipart(body as FormData) : body ? forLog(body) : undefined },
      null,
      2,
    ),
  );

  let httpResponse: Response;
  try {
    httpResponse = await fetch(url, requestOptions);
  } catch (err) {
    console.error(`[dbTwig ✕] ${apiCall} — network failure after ${Date.now() - startedAt} ms`, err);
    return {
      jsonData: { errorMessage: "The data layer at " + DB_TWIG_URL + " could not be reached." } as T,
      ok: false,
      httpStatus: 0,
    };
  }

  // DbTwig normally answers JSON, but proxies and 5xx pages may not.
  const rawText = await httpResponse.text();
  let jsonData: T;
  try {
    jsonData = (rawText ? JSON.parse(rawText) : {}) as T;
  } catch {
    const isHtml = /<(!doctype\s+html|html[\s>])/i.test(rawText);
    jsonData = {
      errorMessage: isHtml
        ? `The data layer returned an HTML error page for ${apiCall}. Check DB_TWIG_URL and the API entry point.`
        : rawText.slice(0, 300),
    } as T;
  }

  console.log(
    `[dbTwig ←] ${httpResponse.status} ${httpResponse.statusText} ${apiCall} (${Date.now() - startedAt} ms)`,
    JSON.stringify(forLog(jsonData), null, 2),
  );

  return { jsonData, ok: httpResponse.ok, httpStatus: httpResponse.status };
}
