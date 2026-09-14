import { NextResponse } from "next/server";
import { callDbTwig } from "@/utils/dbTwig";
import { getSessionCookie } from "@/utils/sessionCookie";
import {
  effectiveFilters,
  type QueryT,
  type QueryResultT,
  type OpportunityRowT,
} from "@/app/workspace/opportunities/queryModel";
import { evaluateSample } from "@/utils/opportunitiesSample";

const SAMPLE_MODE = process.env.HEYNAV_SAMPLE_DATA === "1";
const QUERY_API = process.env.HEYNAV_QUERY_API ?? "heyNav/queryBidOpportunities";

export async function POST(request: Request) {
  const query = (await request.json()) as QueryT;

  const filters = effectiveFilters(query.filters).map((f) =>
    f.op === "in"
      ? { ...f, values: (f.value ?? "").split(",").map((v) => v.trim()).filter(Boolean) }
      : f,
  );
  const request_body = {
    quick: query.quick.trim() || undefined,
    filters,
    sort: query.sort,
    dir: query.dir,
    page: query.page,
    pageSize: query.pageSize,
  };

  if (SAMPLE_MODE) {
    const { rows, total } = evaluateSample(query, filters);
    const result: QueryResultT = { rows, total, page: query.page, pageSize: query.pageSize, source: "sample", apiCall: QUERY_API };
    return NextResponse.json(result);
  }

  const session = await getSessionCookie();
  if (!session?.sessionId) {
    return NextResponse.json(
      { errorMessage: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  const response = await callDbTwig<{ rows?: OpportunityRowT[]; total?: number; errorMessage?: string }>(
    QUERY_API,
    request_body,
    session.sessionId,
  );

  if (!response.ok) {
    const result: QueryResultT = {
      rows: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      source: "dbtwig",
      apiCall: QUERY_API,
      httpStatus: response.httpStatus,
      errorMessage: response.jsonData?.errorMessage ?? `HTTP ${response.httpStatus}`,
    };
    return NextResponse.json(result, { status: 200 });
  }

  const result: QueryResultT = {
    rows: response.jsonData.rows ?? [],
    total: response.jsonData.total ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    source: "dbtwig",
    apiCall: QUERY_API,
  };
  return NextResponse.json(result);
}
