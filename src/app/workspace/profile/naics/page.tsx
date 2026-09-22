import { getNaicsSectors, getUserProfile } from "@/utils/serverFunctions";
import { NaicsProfileScreen } from "./NaicsProfileScreen";
import "./naics.css";

export const dynamic = "force-dynamic";

export default async function NaicsProfilePage() {
  const [sectors, profile] = await Promise.all([getNaicsSectors(), getUserProfile()]);
  const sectorList = sectors.ok && Array.isArray(sectors.jsonData) ? sectors.jsonData : [];
  const saved = profile.ok && "naicsCodes" in profile.jsonData ? profile.jsonData.naicsCodes : [];
  const error = !sectors.ok ? String((sectors.jsonData as { errorMessage?: string }).errorMessage ?? `HTTP ${sectors.httpStatus}`) : null;
  return <NaicsProfileScreen sectors={sectorList} saved={saved} loadError={error} />;
}
