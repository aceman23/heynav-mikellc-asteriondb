import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { createSessionCookie } from "@/utils/sessionCookie";
import type { UserSessionT } from "@/utils/types";

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

  const payload = { jsonData: publicData, ok: response.ok, httpStatus: response.httpStatus };
  return NextResponse.json(payload, { status: response.ok ? 200 : response.httpStatus || 502 });
}
