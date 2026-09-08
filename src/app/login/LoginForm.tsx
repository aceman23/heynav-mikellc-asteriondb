"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserSession } from "@/utils/serverFunctions";

export function LoginForm({
  nextPath,
  settings,
}: {
  nextPath?: string;
  settings: Record<string, unknown>;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Browser-side view of what the login page received from DbTwig.
    console.log("[login] getLoginPageSettings →", settings);
  }, [settings]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const identification = String(form.get("identification") ?? "").trim();
    const password = String(form.get("password") ?? "");

    console.log("[login] createUserSession →", { identification, password: "••••••••" });

    startTransition(async () => {
      const response = await createUserSession(identification, password);
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
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      <div className="field">
        <label htmlFor="identification">Identification</label>
        <div className="control">
          <input
            id="identification"
            name="identification"
            type="text"
            autoComplete="username"
            placeholder="Username or email"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="control">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Password"
            required
          />
          <button
            type="button"
            className="reveal"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          {error.message}
          <span className="code">icam/createUserSession · HTTP {error.status || "no response"}</span>
        </div>
      )}

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Opening session…" : "Sign in"}
      </button>
    </form>
  );
}
