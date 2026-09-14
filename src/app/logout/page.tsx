import { MarkingBar } from "../components/MarkingBar";
import { Wordmark } from "../components/Wordmark";

export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  return (
    <main className="auth">
      <MarkingBar items={["CUI-aware by design", "Perimeter: customer-controlled", "Session ended"]} />
      <div className="end">
        <div className="end-card">
          <Wordmark />
          <h1>Session ended</h1>
          <p className="sub">Your database session was terminated and the session cookie was cleared.</p>

          <div className="actions">
            <a href="/login" className="btn">Back to sign in</a>
          </div>
        </div>
      </div>
    </main>
  );
}
