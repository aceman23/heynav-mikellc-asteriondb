import { describe, it, expect } from "vitest";
import { isSessionExpired } from "../sessionExpiry";

// What DbTwig actually sends (asteriondb/dbTwig middleTier/index.js + icam.pls).
const TIMED_OUT = { status: false, errorCode: 20002, errorMessage: "ORA-20002: This session has timed out" };
const TERMINATED = { status: false, errorCode: 20001, errorMessage: "ORA-20001: An unexpected session status was encountered" };
const UNKNOWN_ID = { status: false, errorCode: 20004, errorMessage: "ORA-20004: The session ID is invalid" };

describe("isSessionExpired", () => {
  it("catches the first call after the idle limit (20002)", () => {
    expect(isSessionExpired(403, TIMED_OUT)).toBe(true);
  });
  it("catches every later call, e.g. a page refresh (20001)", () => {
    expect(isSessionExpired(403, TERMINATED)).toBe(true);
  });
  it("catches a session id ICAM doesn't know (20004, sent as HTTP 500)", () => {
    expect(isSessionExpired(500, UNKNOWN_ID)).toBe(true);
  });
  it("catches the message alone, as the basic opportunities path passes it", () => {
    expect(isSessionExpired(0, { errorMessage: TERMINATED.errorMessage })).toBe(true);
  });
  it("treats any DbTwig 403 as a dead session", () => {
    expect(isSessionExpired(403, {})).toBe(true);
  });
  it("leaves other failures alone", () => {
    expect(isSessionExpired(500, { errorCode: 20100, errorMessage: "ORA-20100: something else" })).toBe(false);
    expect(isSessionExpired(200, {})).toBe(false);
    expect(isSessionExpired(0, undefined)).toBe(false);
  });
});
