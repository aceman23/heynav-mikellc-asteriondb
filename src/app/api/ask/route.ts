import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";
import { sampleAskQuestion } from "@/utils/opportunitiesSample";

const SAMPLE_MODE = process.env.HEYNAV_SAMPLE_DATA === "1";
const ASK_API = process.env.HEYNAV_ASK_API ?? "heyNav/askQuestion";

export async function POST(request: Request) {
  const body = (await request.json()) as { question?: string; opportunityId?: number | null };

  if (!body.question?.trim()) {
    return NextResponse.json({ errorMessage: "A question is required." }, { status: 400 });
  }

  const opportunityId = body.opportunityId ?? null;

  if (SAMPLE_MODE) {
    return NextResponse.json(sampleAskQuestion(body.question, opportunityId));
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json({ errorMessage: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const response = await callDbTwig<{
    answer?: string;
    citations?: { objectId: string; displayName: string; snippet: string }[];
    errorMessage?: string;
  }>(ASK_API, { question: body.question, opportunityId }, session.sessionId);

  if (!response.ok) {
    return NextResponse.json(
      { errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}` },
      { status: response.httpStatus || 502 },
    );
  }

  return NextResponse.json({
    answer: response.jsonData.answer ?? "",
    citations: response.jsonData.citations ?? [],
  });
}
