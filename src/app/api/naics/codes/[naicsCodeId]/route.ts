import { NextResponse } from "next/server";
import { getNaicsCodeDescriptions } from "@/utils/serverFunctions";

// GET /api/naics/codes/660 → heyNav/getNaicsCodeDescriptions { naicsCodeId: 660 }
export async function GET(_request: Request, { params }: { params: Promise<{ naicsCodeId: string }> }) {
  const id = Number((await params).naicsCodeId);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ errorMessage: "Invalid NAICS code id." }, { status: 400 });
  const r = await getNaicsCodeDescriptions(id);
  return NextResponse.json(r.jsonData, { status: r.httpStatus || 502 });
}
