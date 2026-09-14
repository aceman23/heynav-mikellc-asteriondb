// POST /api/upload — proxies a multipart upload to DbTwig's dgBunker/uploadFiles.
//
// Why a route handler and not a server action: server actions have a small
// body limit and no upload progress; a route handler takes the multipart body
// as-is and the browser can watch progress with XMLHttpRequest.
//
// The browser never sees the session id. This handler reads it from the
// httpOnly cookie and adds the bearer header, exactly like callDbTwig does
// for JSON calls. Form fields are forwarded untouched, so the payload matches
// the reference client:
//   name, lastModified, size, newVersion (Y/N), objectId (when newVersion=Y), file

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "@/utils/sessionCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_TWIG_URL = (process.env.DB_TWIG_URL ?? "https://cloud-test.asteriondb.com/dbTwig").replace(/\/+$/, "");
const UPLOAD_API = process.env.HEYNAV_UPLOAD_API ?? "dgBunker/uploadFiles";

export async function POST(request: NextRequest) {
  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "No session. Sign in again." }, { status: 401 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ errorMessage: "No file in the upload." }, { status: 400 });
  }

  // Rebuild the multipart body for the outbound request. Content-Type is set
  // by fetch (it has to include the boundary), so it is deliberately absent here.
  const outgoing = new FormData();
  for (const [key, value] of incoming.entries()) outgoing.append(key, value);

  const url = `${DB_TWIG_URL}/${UPLOAD_API}`;
  const startedAt = Date.now();
  const fields = Object.fromEntries([...incoming.entries()].filter(([k]) => k !== "file").map(([k, v]) => [k, String(v)]));
  console.log(`[dbTwig →] POST ${url} (multipart)`, JSON.stringify({ auth: "bearer session", fields, file: { name: file.name, size: file.size, type: file.type } }));

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + session.sessionId },
      body: outgoing,
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[dbTwig ✕] ${UPLOAD_API} — network failure after ${Date.now() - startedAt} ms`, err);
    return NextResponse.json({ errorMessage: `The data layer at ${DB_TWIG_URL} could not be reached.` }, { status: 502 });
  }

  const text = await upstream.text();
  let jsonData: Record<string, unknown>;
  try {
    jsonData = text ? JSON.parse(text) : {};
  } catch {
    jsonData = { errorMessage: text.slice(0, 300) };
  }
  console.log(`[dbTwig ←] ${upstream.status} ${upstream.statusText} ${UPLOAD_API} (${Date.now() - startedAt} ms)`, JSON.stringify(jsonData).slice(0, 600));

  return NextResponse.json(jsonData, { status: upstream.status });
}
