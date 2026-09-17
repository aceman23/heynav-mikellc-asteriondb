import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";
import { sampleGetDocuments, sampleAttachDocument, type SampleDocumentT } from "@/utils/opportunitiesSample";

const SAMPLE_MODE = process.env.HEYNAV_SAMPLE_DATA === "1";
const ATTACH_DOCUMENT_API = process.env.HEYNAV_ATTACH_DOCUMENT_API ?? "heyNav/attachDocument";
const GET_DOCUMENTS_API = process.env.HEYNAV_GET_DOCUMENTS_API ?? "heyNav/getDocuments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityIdParam = url.searchParams.get("opportunityId");
  const opportunityId = opportunityIdParam === null ? null : Number(opportunityIdParam);

  if (opportunityId !== null && (!Number.isInteger(opportunityId) || opportunityId < 1)) {
    return NextResponse.json({ errorMessage: "Invalid opportunity id." }, { status: 400 });
  }

  if (SAMPLE_MODE) {
    return NextResponse.json({ documents: sampleGetDocuments(opportunityId) });
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const response = await callDbTwig<{ documents?: SampleDocumentT[]; errorMessage?: string }>(
    GET_DOCUMENTS_API,
    { opportunityId },
    session.sessionId,
  );

  if (!response.ok) {
    return NextResponse.json(
      { errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` },
      { status: response.httpStatus || 502 },
    );
  }

  return NextResponse.json({ documents: response.jsonData.documents ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    objectId: string;
    opportunityId: number | null;
    displayName: string;
    documentType: string;
    size: number;
  };

  if (!body.objectId || !body.displayName) {
    return NextResponse.json({ errorMessage: "objectId and displayName are required." }, { status: 400 });
  }

  if (SAMPLE_MODE) {
    const record = sampleAttachDocument({
      objectId: body.objectId,
      opportunityId: body.opportunityId ?? null,
      displayName: body.displayName,
      documentType: body.documentType ?? "attachment",
      size: body.size ?? 0,
    });
    return NextResponse.json(record);
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const response = await callDbTwig<SampleDocumentT & { errorMessage?: string }>(
    ATTACH_DOCUMENT_API,
    body,
    session.sessionId,
  );

  return NextResponse.json(response.jsonData, { status: response.ok ? 200 : response.httpStatus || 502 });
}
