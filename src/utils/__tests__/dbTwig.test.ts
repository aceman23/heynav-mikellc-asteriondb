import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callDbTwig } from "../dbTwig";

// Guards the two transport rules DbTwig depends on:
//  1. anonymous calls carry no Authorization header (ORA-06502 otherwise)
//  2. multipart bodies are forwarded as FormData, not JSON.stringify'd to "{}"

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("callDbTwig", () => {
  it("sends JSON with no Authorization header when there is no session", async () => {
    await callDbTwig("icam/createUserSession", { identification: "u", password: "p" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/icam\/createUserSession$/);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ identification: "u", password: "p" }));
  });

  it("adds Bearer <sessionId> when a session is supplied", async () => {
    await callDbTwig("icam/terminateUserSession", undefined, "ABC123");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ABC123");
  });

  it("forwards FormData bodies as multipart without a JSON Content-Type", async () => {
    const fd = new FormData();
    fd.append("name", "sol.pdf");
    fd.append("newVersion", "N");
    fd.append("file", new File(["hello"], "sol.pdf", { type: "application/pdf" }));

    await callDbTwig("dgBunker/uploadFiles", fd, "ABC123");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(fd);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ABC123");
  });
});
