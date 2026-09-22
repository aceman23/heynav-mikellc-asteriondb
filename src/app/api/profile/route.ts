import { NextResponse } from "next/server";
import { getUserProfile, saveUserProfile, type ProfileNaicsT } from "@/utils/serverFunctions";

export async function GET() {
  const r = await getUserProfile();
  return NextResponse.json(r.jsonData, { status: r.httpStatus || 502 });
}

// PUT { naicsCodes: [{ naicsCodeId, naicsCode, title, sectorCode }] }
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { naicsCodes?: unknown };
  if (!Array.isArray(body.naicsCodes)) return NextResponse.json({ errorMessage: "naicsCodes must be an array." }, { status: 400 });
  const codes: ProfileNaicsT[] = body.naicsCodes
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && Number.isInteger(Number((c as Record<string, unknown>).naicsCodeId)))
    .map((c) => ({ naicsCodeId: Number(c.naicsCodeId), naicsCode: String(c.naicsCode ?? ""), title: String(c.title ?? "").trim(), sectorCode: String(c.sectorCode ?? "") }));
  console.log("[profile →] saveUserProfile", codes.map((c) => c.naicsCode));
  const r = await saveUserProfile(codes);
  return NextResponse.json(r.jsonData, { status: r.httpStatus || 502 });
}
