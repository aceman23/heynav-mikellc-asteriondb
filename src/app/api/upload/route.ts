import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";

const UPLOAD_API = process.env.HEYNAV_UPLOAD_API ?? "dgBunker/uploadFiles";

export async function POST(request: Request) {
  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json(
      { errorMessage: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { errorMessage: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const body = await request.formData();
  if (!(body.get("file") instanceof File)) {
    return NextResponse.json({ errorMessage: "No file in the upload." }, { status: 400 });
  }
  const response = await callDbTwig<Record<string, unknown>>(
    UPLOAD_API,
    body,
    session.sessionId,
  );

  return NextResponse.json(response.jsonData, {
    status: response.ok ? 200 : response.httpStatus || 502,
  });
}
