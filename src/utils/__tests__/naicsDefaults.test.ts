import { describe, it, expect } from "vitest";
import { isDefaultFlag, applySectorDefaults, sectorOf, parseDefaultNaicsCodes } from "../naicsDefaults";
import type { ProfileNaicsT } from "../naicsSample";
const row = (id: number, flag?: boolean) => ({ naicsCodeId: id, naicsCode: String(541500 + id), title: ` Code ${id} `, defaultNaicsCode: flag });
const pick = (id: number): [number, ProfileNaicsT] => [id, { naicsCodeId: id, naicsCode: String(541500 + id), title: `Code ${id}`, sectorCode: "54" }];
describe("isDefaultFlag", () => {
  it("reads the forms AsterionDB may send", () => {
    for (const v of [true, 1, "Y", "y", "yes", "TRUE", "1"]) expect(isDefaultFlag(v)).toBe(true);
    for (const v of [false, 0, "N", "n", "no", "false", "0", ""]) expect(isDefaultFlag(v)).toBe(false);
  });
  it("is undefined when the flag is missing or unrecognized", () => {
    for (const v of [undefined, null, "maybe", {}]) expect(isDefaultFlag(v)).toBeUndefined();
  });
});
describe("applySectorDefaults", () => {
  it("ticks flagged codes and unticks unflagged ones", () => {
    const out = applySectorDefaults(new Map([pick(2)]), "54", [row(1, true), row(2, false)]);
    expect([...out.keys()]).toEqual([1]);
    expect(out.get(1)).toMatchObject({ sectorCode: "54", title: "Code 1" });
  });
  it("leaves codes in other sectors and rows without the flag alone", () => {
    const other: [number, ProfileNaicsT] = [99, { naicsCodeId: 99, naicsCode: "511210", title: "Software", sectorCode: "51" }];
    const out = applySectorDefaults(new Map([other, pick(3)]), "54", [row(3)]);
    expect([...out.keys()].sort()).toEqual([3, 99]);
  });
  it("keeps what the user already changed on this visit", () => {
    const out = applySectorDefaults(new Map([pick(2)]), "54", [row(1, true), row(2, false)], new Set([1, 2]));
    expect([...out.keys()]).toEqual([2]);
  });
  it("returns the same map when nothing changes", () => {
    const m = new Map([pick(1)]);
    expect(applySectorDefaults(m, "54", [row(1, true)])).toBe(m);
  });
});

describe("sectorOf", () => {
  it("uses the code's first two digits, folding multi-prefix sectors", () => {
    expect(sectorOf("541512")).toBe("54");
    expect(sectorOf("332710")).toBe("31");
    expect(sectorOf("454110")).toBe("44");
    expect(sectorOf("493110")).toBe("48");
  });
  it("prefers a sectorCode the API sends", () => {
    expect(sectorOf("541512", "54")).toBe("54");
    expect(sectorOf("332710", "31-33")).toBe("31");
  });
});

describe("parseDefaultNaicsCodes", () => {
  const row = { naicsCodeId: 676, naicsCode: "541512", title: " Computer Systems Design Services " };
  it("reads a wrapped or bare list", () => {
    expect(parseDefaultNaicsCodes({ defaultNaicsCodes: [row] })).toEqual([{ naicsCodeId: 676, naicsCode: "541512", title: "Computer Systems Design Services", sectorCode: "54" }]);
    expect(parseDefaultNaicsCodes([row])).toHaveLength(1);
    expect(parseDefaultNaicsCodes({ naicsCodes: [row] })).toHaveLength(1);
  });
  it("accepts numbers as strings and skips unusable rows", () => {
    const out = parseDefaultNaicsCodes([{ naicsCodeId: "660", naicsCode: 512110 }, { naicsCode: "541512" }, { naicsCodeId: 1 }]);
    expect(out).toEqual([{ naicsCodeId: 660, naicsCode: "512110", title: "", sectorCode: "51" }]);
  });
  it("is empty for an empty or unexpected response", () => {
    expect(parseDefaultNaicsCodes({})).toEqual([]);
    expect(parseDefaultNaicsCodes(null)).toEqual([]);
  });
});
