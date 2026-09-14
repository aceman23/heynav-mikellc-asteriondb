import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";
import type { OpportunityRowT } from "@/app/workspace/opportunities/queryModel";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunityId = Number(id);
  if (!Number.isInteger(opportunityId) || opportunityId < 1) {
    return NextResponse.json({ errorMessage: "Invalid opportunity id." }, { status: 400 });
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const response = await callDbTwig<OpportunityRowT & { errorMessage?: string }>(
    process.env.HEYNAV_GET_OPPORTUNITY_API ?? "heyNav/getBidOpportunity",
    { opportunityId },
    session.sessionId,
  );

  return NextResponse.json(response.jsonData, { status: response.httpStatus || 502 });
}
