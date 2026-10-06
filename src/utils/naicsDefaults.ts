import type { NaicsCodeT, ProfileNaicsT } from "./naicsSample";
// heyNav/getNaicsBySector marks each code with defaultNaicsCode: whether it is in
// the user's saved defaults. That flag, not the app's cookie copy, decides which
// boxes start ticked once a sector's codes are loaded.
/** true / false from the flag, or undefined when the row doesn't carry it. */
export function isDefaultFlag(v: unknown): boolean | undefined {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    if (["Y", "YES", "TRUE", "1"].includes(s)) return true;
    if (["N", "NO", "FALSE", "0", ""].includes(s)) return false;
  }
  return undefined;
}
/**
 * Apply one sector's defaultNaicsCode flags to a selection. Codes the user has
 * already ticked or unticked on this visit (`touched`) keep the user's choice,
 * as do rows without the flag. Returns the same Map when nothing changes.
 */
export function applySectorDefaults(
  selection: Map<number, ProfileNaicsT>,
  sectorCode: string,
  rows: NaicsCodeT[],
  touched: ReadonlySet<number> = new Set(),
): Map<number, ProfileNaicsT> {
  let next: Map<number, ProfileNaicsT> | null = null;
  for (const c of rows) {
    if (c.defaultNaicsCode === undefined || touched.has(c.naicsCodeId)) continue;
    const has = selection.has(c.naicsCodeId);
    if (c.defaultNaicsCode && !has) {
      next ??= new Map(selection);
      next.set(c.naicsCodeId, { naicsCodeId: c.naicsCodeId, naicsCode: c.naicsCode, title: c.title.trim(), sectorCode });
    } else if (!c.defaultNaicsCode && has) {
      next ??= new Map(selection);
      next.delete(c.naicsCodeId);
    }
  }
  return next ?? selection;
}
