import { queryBidOpportunities } from "@/utils/serverFunctions";
import { decodeQuery } from "./queryModel";
import { QueryScreen } from "./QueryScreen";
import "./opportunities.css";

export const dynamic = "force-dynamic";

// The URL is the query. Every run, sort, page, and column change is a
// navigation, so results are shareable and the back button works.
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = decodeQuery(await searchParams);
  const result = await queryBidOpportunities(query);
  return <QueryScreen query={query} result={result} />;
}
