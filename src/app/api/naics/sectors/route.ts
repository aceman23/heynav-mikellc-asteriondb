import { NextResponse } from "next/server";
import { getNaicsSectors } from "@/utils/serverFunctions";

// GET /api/naics/sectors → heyNav/getNaicsSectors
export async function GET() {
  const r = await getNaicsSectors();
  return NextResponse.json(r.jsonData, { status: r.httpStatus || 502 });
}
