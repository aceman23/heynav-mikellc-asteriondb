import { describe, it, expect } from "vitest";
import { extractRows, normalizeRow, evaluateRows, presentKeys } from "../opportunityQuery";
import { DEFAULT_QUERY } from "@/app/workspace/opportunities/queryModel";

// heyNav/getBidOpportunities takes no parameters and its shape is not yet
// pinned, so the normalizer has to cope with the plausible variants.

describe("extractRows", () => {
  it("accepts a bare array", () => expect(extractRows([{ a: 1 }])).toHaveLength(1));
  it("accepts a wrapped array under any key", () => {
    expect(extractRows({ bidOpportunities: [{ a: 1 }, { a: 2 }] })).toHaveLength(2);
    expect(extractRows({ rows: [] })).toHaveLength(0);
  });
  it("returns nothing for an error object", () => expect(extractRows({ errorMessage: "x" })).toHaveLength(0));
});

describe("normalizeRow", () => {
  it("maps camelCase keys straight through", () => {
    const r = normalizeRow({ opportunityId: 7, noticeId: "N1", postedDate: "2026-09-02", awardAmount: "1500" });
    expect(r.opportunityId).toBe(7);
    expect(r.noticeId).toBe("N1");
    expect(r.postedDate).toBe("2026-09-02");
    expect(r.awardAmount).toBe(1500);
  });
  it("maps snake_case and UPPERCASE column names", () => {
    const r = normalizeRow({ OPPORTUNITY_ID: "7", notice_id: "N1", DEPARTMENT_AGENCY: "DEPT OF DEFENSE", pop_state: "MD" });
    expect(r.opportunityId).toBe(7);
    expect(r.noticeId).toBe("N1");
    expect(r.departmentAgency).toBe("DEPT OF DEFENSE");
    expect(r.popState).toBe("MD");
  });
  it("normalizes Oracle-style dates so date filters work", () => {
    const r = normalizeRow({ posted_date: "02-SEP-26", response_deadline: "01-OCT-2026 16:00", award_date: "9/2/2026" });
    expect(r.postedDate).toBe("2026-09-02");
    expect(r.responseDeadline).toBe("2026-10-01T16:00:00");
    expect(r.awardDate).toBe("2026-09-02");
  });
  it("ignores columns not in the catalog and reports which were present", () => {
    const rows = [normalizeRow({ notice_id: "N1", something_else: 1 })];
    expect(rows[0]).not.toHaveProperty("somethingElse");
    expect(presentKeys(rows)).toEqual(["noticeId"]);
  });
});

describe("evaluateRows over normalized data", () => {
  const rows = [
    normalizeRow({ OPPORTUNITY_ID: 1, TITLE: "Cyber support", POSTED_DATE: "02-SEP-26", ACTIVE: "Yes", NAICS_CODE: "541512" }),
    normalizeRow({ OPPORTUNITY_ID: 2, TITLE: "Facility maintenance", POSTED_DATE: "20-AUG-26", ACTIVE: "No", NAICS_CODE: "561210" }),
  ];
  it("filters, sorts, and pages", () => {
    const r = evaluateRows(rows, { ...DEFAULT_QUERY, quick: "cyber" }, []);
    expect(r.total).toBe(1);
    expect(r.rows[0].opportunityId).toBe(1);
    const active = evaluateRows(rows, DEFAULT_QUERY, [{ field: "active", op: "is", value: "Yes" }]);
    expect(active.total).toBe(1);
    const after = evaluateRows(rows, DEFAULT_QUERY, [{ field: "postedDate", op: "after", value: "2026-08-31" }]);
    expect(after.rows.map((x) => x.opportunityId)).toEqual([1]);
    const sorted = evaluateRows(rows, { ...DEFAULT_QUERY, sort: "postedDate", dir: "asc" }, []);
    expect(sorted.rows.map((x) => x.opportunityId)).toEqual([2, 1]);
  });
});
