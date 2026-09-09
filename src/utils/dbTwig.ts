// Server-only transport for AsterionDB's DbTwig middle tier.
//
// Pure HTTP transport: callers read the session cookie themselves and pass
// the sessionId in. This keeps dbTwig.ts free of next/headers so it can be
// safely imported from both "use server" modules and Server Components.

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
      if (k === "password") out[k] = "••••••••";
      else if (k === "sessionId") out[k] = redact(v);
      else if (k === "Authorization" && typeof v === "string")
        out[k] = v.startsWith("Bearer ") && v !== "Bearer null" ? "Bearer " + redact(v.slice(7)) : v;
      else out[k] = forLog(v);
    }
    return out;
  }
  return obj;
}

export async function callDbTwig<T = Record<string, unknown>>(
  apiCall: string,
  options?: { body?: object; sessionId?: string },
): Promise<DbTwigResponseT<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.sessionId) headers.Authorization = "Bearer " + options.sessionId;

  const requestOptions: RequestInit =
    options?.body !== undefined
      ? { method: "POST", headers, body: JSON.stringify(options.body), cache: "no-store" }
      : { method: "GET", headers, cache: "no-store" };

  const url = DB_TWIG_URL + "/" + apiCall;
  const startedAt = Date.now();

  console.log(
    `[dbTwig →] ${requestOptions.method} ${url} | headerKeys=${JSON.stringify(Object.keys(headers))} | Authorization=${headers.Authorization ? "present" : "absent"}`,
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

  const rawText = await httpResponse.text();
  let jsonData: T;
  try {
    jsonData = (rawText ? JSON.parse(rawText) : {}) as T;
  } catch {
    jsonData = { errorMessage: rawText.slice(0, 300) } as T;
  }

  console.log(
    `[dbTwig ←] ${httpResponse.status} ${httpResponse.statusText} ${apiCall} (${Date.now() - startedAt} ms)`,
    JSON.stringify(forLog(jsonData), null, 2),
  );

  return { jsonData, ok: httpResponse.ok, httpStatus: httpResponse.status };
}
