import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";
import { sampleSetFlags } from "@/utils/opportunitiesSample";

const SAMPLE_MODE = process.env.HEYNAV_SAMPLE_DATA === "1";
const SET_FLAGS_API = process.env.HEYNAV_SET_FLAGS_API ?? "heyNav/setOpportunityFlags";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opportunityId = Number(id);
  if (!Number.isInteger(opportunityId) || opportunityId < 1) {
    return NextResponse.json({ errorMessage: "Invalid opportunity id." }, { status: 400 });
  }

  const body = (await request.json()) as { flaggedByUser?: string; rejectedByUser?: string };
  const flags: { flaggedByUser?: string; rejectedByUser?: string } = {};
  if (body.flaggedByUser === "Y" || body.flaggedByUser === "N") flags.flaggedByUser = body.flaggedByUser;
  if (body.rejectedByUser === "Y" || body.rejectedByUser === "N") flags.rejectedByUser = body.rejectedByUser;
  if (!flags.flaggedByUser && !flags.rejectedByUser) {
    return NextResponse.json({ errorMessage: "Provide flaggedByUser or rejectedByUser (Y or N)." }, { status: 400 });
  }

  if (SAMPLE_MODE) {
    const result = sampleSetFlags(opportunityId, flags);
    if (!result) return NextResponse.json({ errorMessage: "Opportunity not found." }, { status: 404 });
    return NextResponse.json(result);
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const response = await callDbTwig<{ errorMessage?: string; flaggedByUser?: string; rejectedByUser?: string }>(
    SET_FLAGS_API,
    { opportunityId, ...flags },
    session.sessionId,
  );

  if (!response.ok) {
    return NextResponse.json(
      { errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` },
      { status: response.httpStatus || 502 },
    );
  }

  return NextResponse.json({ opportunityId, ...response.jsonData });
}
