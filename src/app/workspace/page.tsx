import Link from "next/link";
import { Icon } from "./Icon";
import { getSessionSummary, getProfileNaicsCodes } from "@/utils/serverFunctions";

// Dashboard. Nothing here is faked: workspace listing lands with C-1/C-2,
// so until the heyNav DbTwig service exists this is an honest empty state
// plus the things that are real today (the session, the wiring).
export default async function DashboardPage() {
  const session = (await getSessionSummary())!;
  const naics = await getProfileNaicsCodes();
  const first = session.displayName.split(" ")[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Welcome back, {first}.</h2>
          <p>Every pursuit lives in its own workspace. Start one, or pick up where you left off.</p>
        </div>
        <Link href="/workspace/opportunities" className="btn primary">
          <Icon name="search" />
          Query opportunities
        </Link>
      </div>

      {naics.length === 0 ? (
        <section className="panel" style={{ marginBottom: 16, borderColor: "var(--gold)" }} aria-labelledby="naics-title">
          <h3 id="naics-title">Set up your NAICS codes</h3>
          <p className="muted" style={{ margin: "6px 0 12px" }}>Tell Hey Nav which sectors and codes you work in and it becomes your default opportunity filter.</p>
          <Link href="/workspace/profile/naics" className="btn primary">Choose my codes</Link>
        </section>
      ) : (
        <section className="panel" style={{ marginBottom: 16 }} aria-labelledby="naics-title">
          <h3 id="naics-title">Your NAICS codes</h3>
          <p className="muted" style={{ margin: "6px 0 12px" }}>{naics.join(", ")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/workspace/opportunities?preset=mynaics" className="btn primary">Opportunities in my codes</Link>
            <Link href="/workspace/profile/naics" className="btn quiet">Edit</Link>
          </div>
        </section>
      )}

      <section className="panel empty" aria-labelledby="pursuits-title">
        <h3 id="pursuits-title">No pursuit workspaces yet</h3>
        <p>
          A workspace holds one solicitation and everything you build against it — the shred, the
          compliance matrix, drafts, red-team reports — as governed objects in your database.
        </p>
        <Link href="/workspace/workspaces" className="btn quiet">Create your first workspace</Link>
      </section>

      <div className="two-up">
        <section className="panel" aria-labelledby="session-title">
          <h3 id="session-title">Your session</h3>
          <dl className="ledger">
            <div><dt>Signed in as</dt><dd>{session.displayName}</dd></div>
            <div><dt>Email</dt><dd>{session.emailAddress ?? "—"}</dd></div>
            <div><dt>Opened</dt><dd>{new Date(session.signedInAt).toLocaleString()}</dd></div>
            <div><dt>Token</dt><dd>httpOnly cookie, server-side only</dd></div>
          </dl>
        </section>

        <section className="panel" aria-labelledby="wiring-title">
          <h3 id="wiring-title">Platform wiring</h3>
          <dl className="ledger">
            <div><dt>Sign in</dt><dd><span className="status ok">icam/createUserSession</span></dd></div>
            <div><dt>Sign out</dt><dd><span className="status ok">icam/terminateUserSession</span></dd></div>
            <div><dt>Opportunities</dt><dd><span className="status warn">heyNav/queryBidOpportunities · install db/heynav</span></dd></div>
            <div><dt>Workspaces</dt><dd><span className="status">C-1 / C-2 · pending</span></dd></div>
            <div><dt>Inference</dt><dd><span className="status">adapter C-7 · pending tenancy</span></dd></div>
          </dl>
        </section>
      </div>
    </>
  );
}
