import { redirect } from "next/navigation";
import { AppShell } from "./AppShell";
import { getSessionSummary } from "@/utils/serverQueries";
import "./app.css";

export const dynamic = "force-dynamic";

// Everything under /workspace renders inside the signed-in shell.
// Middleware already bounces anonymous requests; this is the server-side check.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSummary();
  if (null === session) redirect("/login");

  const dataLayer = (process.env.DB_TWIG_URL ?? "https://cloud-test.asteriondb.com/dbTwig").replace(/^https?:\/\//, "").split("/")[0];

  return (
    <AppShell session={session} dataLayer={dataLayer}>
      {children}
    </AppShell>
  );
}
