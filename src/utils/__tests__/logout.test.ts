import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";

const DB_TWIG_URL = "http://127.0.0.1:3999";

let server: http.Server;
let requests: { method: string; path: string; auth?: string | null; body?: unknown }[] = [];

function startMockDbTwig(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
        const auth = req.headers.authorization ?? null;
        requests.push({ method: req.method ?? "GET", path: req.url ?? "", auth, body });

        if (req.url?.startsWith("/icam/terminateUserSession")) {
          if (auth && auth.startsWith("Bearer VALID_SESSION")) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ sessionStatus: "terminated" }));
          } else {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ errorMessage: "Invalid or expired session" }));
          }
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errorMessage: "Not found" }));
      });
    });
    server.listen(3999, "127.0.0.1", () => resolve());
  });
}

function stopMockDbTwig(): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe("logout flow — terminateUserSession", () => {
  beforeEach(async () => {
    requests = [];
    process.env.DB_TWIG_URL = DB_TWIG_URL;
    process.env.DB_TWIG_LOG_SECRETS = "0";
    await startMockDbTwig();
  });

  afterEach(async () => {
    await stopMockDbTwig();
    vi.restoreAllMocks();
  });

  it("calls icam/terminateUserSession with the Bearer token from the cookie", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: () => ({
          value: JSON.stringify({
            sessionId: "VALID_SESSION_12345678",
            displayName: "Test User",
            emailAddress: "test@example.com",
            signedInAt: "2026-09-10T12:00:00.000Z",
          }),
        }),
        delete: vi.fn(),
      }),
    }));

    const { terminateUserSession } = await import("../serverFunctions");
    const result = await terminateUserSession();

    expect(result.ok).toBe(true);
    expect(result.hadSession).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.dataLayer).toBe(DB_TWIG_URL);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("GET");
    expect(requests[0].path).toBe("/icam/terminateUserSession");
    expect(requests[0].auth).toBe("Bearer VALID_SESSION_12345678");
  });

  it("returns hadSession=false when no cookie is present", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: () => undefined,
        delete: vi.fn(),
      }),
    }));

    const { terminateUserSession } = await import("../serverFunctions");
    const result = await terminateUserSession();

    expect(result.ok).toBe(true);
    expect(result.hadSession).toBe(false);
    expect(result.httpStatus).toBe(204);
    expect(requests).toHaveLength(0);
  });

  it("clears the cookie even when the server rejects the session", async () => {
    vi.resetModules();
    const deleteMock = vi.fn();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: () => ({
          value: JSON.stringify({
            sessionId: "EXPIRED_SESSION_abcdef",
            displayName: "Test User",
            emailAddress: "test@example.com",
            signedInAt: "2026-09-10T12:00:00.000Z",
          }),
        }),
        delete: deleteMock,
      }),
    }));

    const { terminateUserSession } = await import("../serverFunctions");
    const result = await terminateUserSession();

    expect(result.ok).toBe(false);
    expect(result.hadSession).toBe(true);
    expect(result.httpStatus).toBe(403);
    expect(deleteMock).toHaveBeenCalledWith("heynav.session");

    expect(requests).toHaveLength(1);
    expect(requests[0].auth).toBe("Bearer EXPIRED_SESSION_abcdef");
  });
});
