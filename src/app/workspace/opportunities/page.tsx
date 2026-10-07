import { queryBidOpportunities, getUserProfile } from "@/utils/serverFunctions";
import { decodeQuery } from "./queryModel";
import { QueryScreen } from "./QueryScreen";
import "./opportunities.css";
import { redirect } from "next/navigation";
import { redirectIfSessionExpiredOnServer } from "@/utils/sessionGuard";

export const dynamic = "force-dynamic";

// The URL is the query. Every run, sort, page, and column change is a
// navigation, so results are shareable and the back button works.
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getUserProfile();
  redirectIfSessionExpiredOnServer(profile);
  const profileCodes = profile.ok && "naicsCodes" in profile.jsonData ? profile.jsonData.naicsCodes.map((c) => c.naicsCode) : [];
  // ?preset=mynaics — deep link from the NAICS profile page.
  if (params.preset === "mynaics" && profileCodes.length) {
    redirect(`/workspace/opportunities?f=${encodeURIComponent(`naicsCode|in|${encodeURIComponent(profileCodes.join(","))}`)}`);
  }
  const query = decodeQuery(params);
  const result = await queryBidOpportunities(query);
  redirectIfSessionExpiredOnServer(result);
  return <QueryScreen query={query} result={result} profileCodes={profileCodes} />;
}
