"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LoginResponseT = {
  jsonData?: { errorMessage?: string };
  ok: boolean;
  httpStatus: number;
};

export function LoginForm({ nextPath, settings }: { nextPath?: string; settings: Record<string, unknown> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [identification, setIdentification] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    startTransition(async () => {
      try {
        const httpResponse = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identification, password }),
        });
        const response = (await httpResponse.json()) as LoginResponseT;
        console.log("[login] createUserSession ←", response.httpStatus, response);

        if (response.ok) {
          router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/workspace");
          return;
        }

        setError({
          message:
            response.jsonData?.errorMessage ??
            (response.httpStatus === 0
              ? "The data layer could not be reached. Check DB_TWIG_URL and try again."
              : "That identification and password combination was not accepted."),
          status: response.httpStatus,
        });
      } catch {
        setError({ message: "The sign-in service could not be reached. Try again.", status: 0 });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="on">
      <div className="field">
        <label htmlFor="identification">Identification</label>
        <div className="control">
          <input
            id="identification"
            name="identification"
            type="text"
            autoComplete="username"
            required
            value={identification}
            onChange={(e) => setIdentification(e.target.value)}
            placeholder={typeof settings.identificationHint === "string" ? settings.identificationHint : "Your workspace identification"}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="control">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="reveal" onClick={() => setShowPw((v) => !v)}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          {error.message}
          <span className="code">HTTP {error.status}</span>
        </div>
      )}

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
