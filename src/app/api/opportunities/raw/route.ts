import { NextResponse } from "next/server";
import { getRawOpportunitiesPayload } from "@/utils/serverFunctions";

// GET /api/opportunities/raw — the list entry point's response as received,
// plus which catalog keys were recognised. Sign in first, then open it in a tab.
export async function GET() {
  const r = await getRawOpportunitiesPayload();
  return NextResponse.json(
    { ok: r.ok, httpStatus: r.httpStatus, errorMessage: r.errorMessage, rowCount: r.rows.length, recognisedKeys: r.rows.length ? Object.keys(r.rows[0]) : [], raw: r.raw },
    { status: r.ok ? 200 : r.httpStatus || 502 },
  );
}
