import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ICAM returns sessionStatus "active" for a normal login and "session limit" when
// the account already has its maximum sessions (the new session is held). Only
// "active" signs in; a held session can list other sessions and end one.

const callDbTwig = vi.fn();
vi.mock("@/utils/dbTwig", () => ({ callDbTwig: (...a: unknown[]) => callDbTwig(...a) }));

import { POST as login } from "../route";
import { GET as listSessions, POST as endSession, DELETE as cancelHeld } from "../sessions/route";

function loginReq() {
  return login(new Request("http://x/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identification: "aceman23", password: "pw" }),
  }));
}
const PENDING = "heynav.pending=" + encodeURIComponent(JSON.stringify({ sessionId: "HELD", displayName: "A B", emailAddress: null }));
function req(method: string, body?: unknown, cookie = PENDING) {
  return new NextRequest("http://x/api/login/sessions", {
    method,
    headers: { cookie, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const OTHER = "A49CF6EDAEB8299E2DE850A3F9E92C1D";

beforeEach(() => {
  callDbTwig.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/login", () => {
  it("sets the session cookie for an active session", async () => {
    callDbTwig.mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { sessionId: "ABC", sessionStatus: "active", firstName: "A", lastName: "B", emailAddress: null } });
    const res = await loginReq();
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("heynav.session=");
    expect(JSON.stringify(await res.json())).not.toContain("ABC");
  });

  it("holds a session-limit login, lists the other sessions, and sets only the pending cookie", async () => {
    callDbTwig
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { sessionId: "HELD", sessionStatus: "session limit", firstName: "A", lastName: "B", emailAddress: null } })
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { activeSessions: [{ sessionId: OTHER, clientAddress: "10.0.0.5", userAgent: "Firefox", sessionCreated: 1, lastActivity: 2 }] } });
    const res = await loginReq();
    expect(res.status).toBe(409);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("heynav.pending=");
    expect(cookie).not.toContain("heynav.session=");
    const body = await res.json();
    expect(body.sessionLimit).toBe(true);
    expect(body.jsonData.activeSessions).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("HELD");
    expect(callDbTwig).toHaveBeenLastCalledWith("icam/getActiveSessions", undefined, "HELD");
  });

  it("refuses and releases any other non-active status", async () => {
    callDbTwig
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { sessionId: "X", sessionStatus: "change password" } })
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: {} });
    const res = await loginReq();
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(callDbTwig).toHaveBeenLastCalledWith("icam/terminateUserSession", undefined, "X");
  });
});

describe("/api/login/sessions", () => {
  it("lists active sessions with the held session's bearer", async () => {
    callDbTwig.mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { activeSessions: [] } });
    const res = await listSessions(req("GET"));
    expect(res.status).toBe(200);
    expect(callDbTwig).toHaveBeenCalledWith("icam/getActiveSessions", undefined, "HELD");
  });

  it("ends another session and promotes the held one to the session cookie", async () => {
    callDbTwig
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { activeSessions: [{ sessionId: OTHER }] } })
      .mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { sessionStatus: "active" } });
    const res = await endSession(req("POST", { sessionToTerminate: OTHER }));
    expect(res.status).toBe(200);
    expect(callDbTwig).toHaveBeenCalledWith("icam/abandonForCurrentSession", { sessionToTerminate: OTHER }, "HELD");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("heynav.session=");
    expect(cookie).toMatch(/heynav\.pending=;/);
  });

  it("refuses to end a session that isn't in this user's active list", async () => {
    callDbTwig.mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: { activeSessions: [{ sessionId: OTHER }] } });
    const res = await endSession(req("POST", { sessionToTerminate: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF" }));
    expect(res.status).toBe(409);
    expect(callDbTwig).not.toHaveBeenCalledWith("icam/abandonForCurrentSession", expect.anything(), expect.anything());
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a malformed session id without calling ICAM", async () => {
    const res = await endSession(req("POST", { sessionToTerminate: "not-hex" }));
    expect(res.status).toBe(400);
    expect(callDbTwig).not.toHaveBeenCalled();
  });

  it("reports an expired hold when the pending cookie is gone", async () => {
    const res = await endSession(req("POST", { sessionToTerminate: OTHER }, ""));
    expect(res.status).toBe(401);
  });

  it("cancel releases the held session and clears the pending cookie", async () => {
    callDbTwig.mockResolvedValueOnce({ ok: true, httpStatus: 200, jsonData: {} });
    const res = await cancelHeld(req("DELETE"));
    expect(res.status).toBe(200);
    expect(callDbTwig).toHaveBeenCalledWith("icam/terminateUserSession", undefined, "HELD");
    expect(res.headers.get("set-cookie") ?? "").toMatch(/heynav\.pending=;/);
  });
});
