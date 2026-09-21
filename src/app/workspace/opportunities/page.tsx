import { queryBidOpportunities } from "@/utils/serverFunctions";
import { decodeQuery } from "./queryModel";
import { QueryScreen } from "./QueryScreen";
import "./opportunities.css";
import { redirect } from "next/navigation";
import { isSessionExpired } from "@/utils/sessionExpiry";

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
  if (result.httpStatus && isSessionExpired(result.httpStatus, { errorMessage: result.errorMessage })) {
    redirect("/logout?reason=expired");
  }
  return <QueryScreen query={query} result={result} />;
}
