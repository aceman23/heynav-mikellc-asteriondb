import { NextResponse } from "next/server";
import { getBidOpportunity } from "@/utils/serverFunctions";

function parseId(id: string) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const opportunityId = parseId((await params).id);
  if (!opportunityId) return NextResponse.json({ errorMessage: "Invalid opportunity id." }, { status: 400 });
  const response = await getBidOpportunity(opportunityId);
  return NextResponse.json(response.jsonData, { status: response.httpStatus || 502 });
}
