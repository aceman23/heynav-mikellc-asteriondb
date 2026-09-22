import { NextResponse } from "next/server";
import { getNaicsBySector } from "@/utils/serverFunctions";

// GET /api/naics/sectors/54 → heyNav/getNaicsBySector { sectorCode: "54" }
export async function GET(_request: Request, { params }: { params: Promise<{ sectorCode: string }> }) {
  const { sectorCode } = await params;
  if (!/^\d{2}(-\d{2})?$/.test(sectorCode)) return NextResponse.json({ errorMessage: "Invalid sector code." }, { status: 400 });
  const r = await getNaicsBySector(sectorCode);
  return NextResponse.json(r.jsonData, { status: r.httpStatus || 502 });
}
