import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("../dbTwig", () => ({
  callDbTwig: vi.fn(),
  dbTwigBaseUrl: vi.fn(() => "https://cloud-test.asteriondb.com/dbTwig"),
}));

import { cookies } from "next/headers";
import { callDbTwig } from "../dbTwig";
import { deleteSessionCookie, getSessionCookie } from "../sessionCookie";

type MockCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function mockCookies(store: Partial<MockCookieStore> = {}) {
  const full: MockCookieStore = {
    get: store.get ?? (() => undefined),
    set: store.set ?? vi.fn(),
    delete: store.delete ?? vi.fn(),
  };
  vi.mocked(cookies).mockResolvedValue(full as never);
  return full;
}

describe("logout flow — deleteSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the cookie with path: '/' so it matches the cookie set at sign-in", async () => {
    const store = mockCookies();
    await deleteSessionCookie();
    expect(store.delete).toHaveBeenCalledWith({ name: "heynav.session", path: "/" });
  });
});

describe("logout flow — terminateUserSession via /api/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hadSession=false when no cookie is present", async () => {
    mockCookies({ get: () => undefined });
    const { POST } = await import("@/app/api/logout/route");

    const response = await POST();
    const json = await response.json();

    expect(json.hadSession).toBe(false);
    expect(json.httpStatus).toBe(204);
  });

  it("calls icam/terminateUserSession with the Bearer token from the cookie", async () => {
    const session = {
      sessionId: "abc123",
      displayName: "Test User",
      emailAddress: null,
      signedInAt: "2026-01-01T00:00:00.000Z",
    };
    mockCookies({
      get: () => ({ value: JSON.stringify(session) }),
    });
    vi.mocked(callDbTwig).mockResolvedValue({
      jsonData: { sessionStatus: "terminated" },
      ok: true,
      httpStatus: 200,
    } as never);

    const { POST } = await import("@/app/api/logout/route");
    const response = await POST();
    const json = await response.json();

    expect(callDbTwig).toHaveBeenCalledWith(
      "icam/terminateUserSession",
      undefined,
      "abc123",
    );
    expect(json.hadSession).toBe(true);
    expect(json.ok).toBe(true);
  });

  it("clears the cookie even when the server rejects the session", async () => {
    const session = {
      sessionId: "abc123",
      displayName: "Test User",
      emailAddress: null,
      signedInAt: "2026-01-01T00:00:00.000Z",
    };
    const store = mockCookies({
      get: () => ({ value: JSON.stringify(session) }),
    });
    vi.mocked(callDbTwig).mockResolvedValue({
      jsonData: { errorMessage: "Invalid or expired session" },
      ok: false,
      httpStatus: 403,
    } as never);

    const { POST } = await import("@/app/api/logout/route");
    const response = await POST();
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.httpStatus).toBe(403);
    expect(store.delete).toHaveBeenCalledWith({ name: "heynav.session", path: "/" });
  });
});
