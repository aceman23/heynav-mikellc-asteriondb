import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import type { UserSessionT } from "@/utils/serverFunctions";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const identification = typeof input.identification === "string" ? input.identification.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!identification || !password) {
    return NextResponse.json(
      { jsonData: { errorMessage: "Enter an identification and password." }, ok: false, httpStatus: 400 },
      { status: 400 },
    );
  }

  const response = await callDbTwig<UserSessionT>("icam/createUserSession", {
    identification,
    password,
  });
  const { sessionId, ...publicData } = response.jsonData ?? ({} as UserSessionT);
  const payload = { jsonData: publicData, ok: response.ok, httpStatus: response.httpStatus };
  const result = NextResponse.json(payload, { status: response.ok ? 200 : response.httpStatus || 502 });

  if (response.ok && sessionId) {
    const displayName =
      [publicData.firstName, publicData.lastName].filter(Boolean).join(" ") || identification;
    result.cookies.set("heynav.session", JSON.stringify({
      sessionId,
      displayName,
      emailAddress: publicData.emailAddress ?? null,
      signedInAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    console.log(`[cookie] set heynav.session for ${displayName}`);
  }

  return result;
}
