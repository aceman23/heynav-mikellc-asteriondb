import { MarkingBar } from "../components/MarkingBar";
import { Wordmark } from "../components/Wordmark";
import { LoginForm } from "./LoginForm";
import { getLoginPageSettings } from "@/utils/serverQueries";

export const dynamic = "force-dynamic";

function pick(settings: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = settings[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // First DbTwig call of the session: anonymous GET for login-page settings.
  // Watch the server console for the [dbTwig →] / [dbTwig ←] trace.
  const settings = await getLoginPageSettings();
  const data = settings.ok ? settings.jsonData : {};
  const serviceTitle = pick(data, ["serviceTitle", "title", "applicationName", "serviceName"]);
  const host = settings.dataLayer.replace(/^https?:\/\//, "");

  return (
    <main className="auth">
      <MarkingBar items={["CUI-aware by design", "Perimeter: customer-controlled", "Session checked on every call"]} />

      <div className="auth-grid">
        <section className="brief" aria-labelledby="brief-title">
          <Wordmark dark />

          <div>
            <h1 id="brief-title">Your proposals and your CUI, inside your own boundary.</h1>
            <p className="lede">
              Hey Nav holds every solicitation, draft, and deliverable as a governed database
              object on AsterionDB. Signing in opens a session in that database — nothing is
              uploaded to anyone else&apos;s SaaS.
            </p>
          </div>

          <dl className="ledger" aria-label="Connection details">
            <div>
              <dt>Data layer</dt>
              <dd>{host}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{serviceTitle ?? "Hey Nav"}</dd>
            </div>
            <div>
              <dt>Settings call</dt>
              <dd>
                <span className={`status ${settings.ok ? "ok" : settings.httpStatus === 0 ? "bad" : "warn"}`}>
                  {settings.apiCall}
                  {" · "}
                  {settings.httpStatus === 0 ? "unreachable" : `HTTP ${settings.httpStatus}`}
                </span>
              </dd>
            </div>
            <div>
              <dt>Sign-in call</dt>
              <dd>POST icam/createUserSession</dd>
            </div>
          </dl>
        </section>

        <section className="form-col">
          <div className="form-card">
            <h2>Sign in to {serviceTitle ?? "Hey Nav"}</h2>
            <p className="sub">Use the identification and password your workspace administrator issued.</p>

            <LoginForm nextPath={next} settings={data} />

            <p className="help">Need access or locked out? Ask your workspace administrator — accounts are created inside your boundary, not by MIKE LLC.</p>
            <p className="foot">MIKE LLC · SDVOSB · CAGE 10KA6 · Powered by AsterionDB</p>
          </div>
        </section>
      </div>
    </main>
  );
}
