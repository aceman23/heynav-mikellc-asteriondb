import { NextResponse } from "next/server";
import { callDbTwig, dbTwigBaseUrl } from "@/utils/dbTwig";
import { deleteSessionCookie, getSessionCookie } from "@/utils/sessionCookie";

export async function POST() {
  const session = await getSessionCookie();
  const dataLayer = dbTwigBaseUrl();

  if (!session) {
    return NextResponse.json({ jsonData: {}, ok: true, httpStatus: 204, hadSession: false, dataLayer });
  }

  const response = await callDbTwig<{ errorMessage?: string }>(
    "icam/terminateUserSession",
    undefined,
    session.sessionId,
  );
  await deleteSessionCookie();

  return NextResponse.json({ ...response, hadSession: true, dataLayer }, { status: 200 });
}
