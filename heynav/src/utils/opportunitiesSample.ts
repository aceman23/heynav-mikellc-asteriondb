// Sample data + in-memory evaluator for the opportunities query screen.
// Enabled with HEYNAV_SAMPLE_DATA=1 so the UI can be exercised before the
// heyNav DbTwig service exists. Every row is marked SAMPLE-*; none of it is
// real SAM.gov content. The evaluator implements the same operator semantics
// the PL/SQL API implements (db/heynav/heynav_query.pls) — treat it as the
// executable spec for those semantics.

import { FIELD_BY_KEY } from "@/app/workspace/opportunities/fields";
import type { FilterT, OpportunityRowT, QueryT } from "@/app/workspace/opportunities/queryModel";

const d = (s: string) => s; // dates as ISO strings

const SAMPLE_ROWS: OpportunityRowT[] = [
  { opportunityId: 1001, noticeId: "SAMPLE-0001", title: "Cybersecurity Assessment and Continuous Monitoring Support", solicitationNumber: "W91ZLK-26-R-0001", departmentAgency: "DEPT OF DEFENSE", cgac: "097", subTier: "DEPT OF THE ARMY", fpdsCode: "2100", office: "ACC-APG", aacCode: "W91ZLK", postedDate: d("2026-09-02"), type: "Solicitation", baseType: "Presolicitation", archiveType: "auto30", archiveDate: null, setAsideCode: "SDVOSBC", setAside: "Service-Disabled Veteran-Owned Small Business (SDVOSB) Set-Aside (FAR 19.14)", responseDeadline: d("2026-10-01T16:00:00"), naicsCode: "541512", classificationCode: "D310", popStreetAddress: null, popCity: "Aberdeen Proving Ground", popState: "MD", popZipCode: "21005", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: "Contract Specialist", primaryContactFullname: "Sample Contact One", primaryContactEmail: "sample.one@example.mil", primaryContactPhone: "410-555-0101", primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "MD", city: "Aberdeen Proving Ground", zipCode: "21005", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0001/view", description: "Sample notice. The contractor shall provide cybersecurity assessment, RMF documentation, and continuous monitoring support.", rejectedByUser: "N", parseTimestamp: d("2026-09-03T04:10:00"), lineNumberInExtract: 12 },
  { opportunityId: 1002, noticeId: "SAMPLE-0002", title: "Enterprise Data Analytics Platform Modernization", solicitationNumber: "HHSN316-26-Q-0007", departmentAgency: "HEALTH AND HUMAN SERVICES, DEPARTMENT OF", cgac: "075", subTier: "NATIONAL INSTITUTES OF HEALTH", fpdsCode: "7529", office: "NIH OD OLAO", aacCode: "HHSN316", postedDate: d("2026-08-28"), type: "Sources Sought", baseType: "Sources Sought", archiveType: "auto15", archiveDate: null, setAsideCode: "SBA", setAside: "Total Small Business Set-Aside (FAR 19.5)", responseDeadline: d("2026-09-18T17:00:00"), naicsCode: "541511", classificationCode: "DA01", popStreetAddress: null, popCity: "Bethesda", popState: "MD", popZipCode: "20892", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: null, primaryContactFullname: "Sample Contact Two", primaryContactEmail: "sample.two@example.gov", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "MD", city: "Bethesda", zipCode: "20892", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0002/view", description: "Sample notice. Market research for modernization of an enterprise analytics platform.", rejectedByUser: "N", parseTimestamp: d("2026-08-29T04:10:00"), lineNumberInExtract: 48 },
  { opportunityId: 1003, noticeId: "SAMPLE-0003", title: "Facility Maintenance Services, Naval Base Kitsap", solicitationNumber: "N44255-26-R-0020", departmentAgency: "DEPT OF DEFENSE", cgac: "097", subTier: "DEPT OF THE NAVY", fpdsCode: "1700", office: "NAVFAC NORTHWEST", aacCode: "N44255", postedDate: d("2026-08-20"), type: "Combined Synopsis/Solicitation", baseType: "Combined Synopsis/Solicitation", archiveType: "auto30", archiveDate: null, setAsideCode: "8A", setAside: "8(a) Set-Aside (FAR 19.8)", responseDeadline: d("2026-09-25T14:00:00"), naicsCode: "561210", classificationCode: "S201", popStreetAddress: null, popCity: "Silverdale", popState: "WA", popZipCode: "98315", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: "Contracting Officer", primaryContactFullname: "Sample Contact Three", primaryContactEmail: "sample.three@example.mil", primaryContactPhone: "360-555-0103", primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "WA", city: "Silverdale", zipCode: "98315", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0003/view", description: "Sample notice. Base operating support and facility maintenance.", rejectedByUser: "N", parseTimestamp: d("2026-08-21T04:10:00"), lineNumberInExtract: 203 },
  { opportunityId: 1004, noticeId: "SAMPLE-0004", title: "Zero Trust Architecture Implementation Support", solicitationNumber: "70RSAT26R00000012", departmentAgency: "HOMELAND SECURITY, DEPARTMENT OF", cgac: "070", subTier: "SCIENCE AND TECHNOLOGY DIRECTORATE", fpdsCode: "7001", office: "S&T ACQUISITIONS", aacCode: "70RSAT", postedDate: d("2026-09-08"), type: "Presolicitation", baseType: "Presolicitation", archiveType: "auto30", archiveDate: null, setAsideCode: null, setAside: null, responseDeadline: d("2026-10-15T15:00:00"), naicsCode: "541519", classificationCode: "D399", popStreetAddress: null, popCity: "Washington", popState: "DC", popZipCode: "20528", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: null, primaryContactFullname: "Sample Contact Four", primaryContactEmail: "sample.four@example.gov", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "DC", city: "Washington", zipCode: "20528", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0004/view", description: "Sample notice. Full and open; zero trust implementation across enterprise systems.", rejectedByUser: "N", parseTimestamp: d("2026-09-09T04:10:00"), lineNumberInExtract: 5 },
  { opportunityId: 1005, noticeId: "SAMPLE-0005", title: "Medical Logistics Support Services", solicitationNumber: "36C10G26Q0044", departmentAgency: "VETERANS AFFAIRS, DEPARTMENT OF", cgac: "036", subTier: "VETERANS AFFAIRS, DEPARTMENT OF", fpdsCode: "3600", office: "NATIONAL ACQUISITION CENTER", aacCode: "36C10G", postedDate: d("2026-07-15"), type: "Award Notice", baseType: "Solicitation", archiveType: "auto30", archiveDate: d("2026-09-01"), setAsideCode: "SDVOSBC", setAside: "Service-Disabled Veteran-Owned Small Business (SDVOSB) Set-Aside (FAR 19.14)", responseDeadline: d("2026-08-05T16:00:00"), naicsCode: "541614", classificationCode: "R699", popStreetAddress: null, popCity: "Hines", popState: "IL", popZipCode: "60141", popCountry: "USA", active: "No", awardNumber: "36C10G26C0090", awardDate: d("2026-08-28"), awardAmount: 4850000, awardee: "SAMPLE AWARDEE LLC", primaryContactTitle: null, primaryContactFullname: "Sample Contact Five", primaryContactEmail: "sample.five@example.gov", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "IL", city: "Hines", zipCode: "60141", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0005/view", description: "Sample notice. Awarded.", rejectedByUser: "N", parseTimestamp: d("2026-08-29T04:10:00"), lineNumberInExtract: 77 },
  { opportunityId: 1006, noticeId: "SAMPLE-0006", title: "Training Range Instrumentation Sustainment", solicitationNumber: "FA8730-26-R-0009", departmentAgency: "DEPT OF DEFENSE", cgac: "097", subTier: "DEPT OF THE AIR FORCE", fpdsCode: "5700", office: "FA8730 AFLCMC HBK", aacCode: "FA8730", postedDate: d("2026-09-10"), type: "Special Notice", baseType: "Special Notice", archiveType: "auto15", archiveDate: null, setAsideCode: null, setAside: null, responseDeadline: null, naicsCode: "334511", classificationCode: "J069", popStreetAddress: null, popCity: "Hanscom AFB", popState: "MA", popZipCode: "01731", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: null, primaryContactFullname: "Sample Contact Six", primaryContactEmail: "sample.six@example.mil", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "MA", city: "Hanscom AFB", zipCode: "01731", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0006/view", description: "Sample notice. Industry day announcement.", rejectedByUser: "N", parseTimestamp: d("2026-09-11T04:10:00"), lineNumberInExtract: 31 },
  { opportunityId: 1007, noticeId: "SAMPLE-0007", title: "Proposal Development and Capture Support", solicitationNumber: "GS00Q26BJD0011", departmentAgency: "GENERAL SERVICES ADMINISTRATION", cgac: "047", subTier: "FEDERAL ACQUISITION SERVICE", fpdsCode: "4732", office: "GSA/FAS/AAS", aacCode: "GS00Q", postedDate: d("2026-09-04"), type: "Solicitation", baseType: "Solicitation", archiveType: "auto30", archiveDate: null, setAsideCode: "WOSB", setAside: "Women-Owned Small Business (WOSB) Program Set-Aside (FAR 19.15)", responseDeadline: d("2026-09-30T12:00:00"), naicsCode: "541611", classificationCode: "R408", popStreetAddress: null, popCity: "Arlington", popState: "VA", popZipCode: "22202", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: null, primaryContactFullname: "Sample Contact Seven", primaryContactEmail: "sample.seven@example.gov", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "VA", city: "Arlington", zipCode: "22202", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0007/view", description: "Sample notice. Management consulting for capture and proposal development.", rejectedByUser: "Y", parseTimestamp: d("2026-09-05T04:10:00"), lineNumberInExtract: 66 },
  { opportunityId: 1008, noticeId: "SAMPLE-0008", title: "Secure Cloud Migration for Mission Applications", solicitationNumber: "HC1028-26-R-0031", departmentAgency: "DEPT OF DEFENSE", cgac: "097", subTier: "DEFENSE INFORMATION SYSTEMS AGENCY", fpdsCode: "97AS", office: "DITCO-SCOTT", aacCode: "HC1028", postedDate: d("2026-09-12"), type: "Solicitation", baseType: "Presolicitation", archiveType: "auto30", archiveDate: null, setAsideCode: "HZC", setAside: "HUBZone Set-Aside (FAR 19.13)", responseDeadline: d("2026-10-20T16:00:00"), naicsCode: "518210", classificationCode: "DF01", popStreetAddress: null, popCity: "Scott AFB", popState: "IL", popZipCode: "62225", popCountry: "USA", active: "Yes", awardNumber: null, awardDate: null, awardAmount: null, awardee: null, primaryContactTitle: null, primaryContactFullname: "Sample Contact Eight", primaryContactEmail: "sample.eight@example.mil", primaryContactPhone: null, primaryContactFax: null, secondaryContactTitle: null, secondaryContactFullname: null, secondaryContactEmail: null, secondaryContactPhone: null, secondaryContactFax: null, organizationType: "OFFICE", state: "IL", city: "Scott AFB", zipCode: "62225", countryCode: "USA", additionalInfoLink: null, link: "https://sam.gov/opp/SAMPLE-0008/view", description: "Sample notice. Migration of mission applications to an IL5 cloud environment.", rejectedByUser: "N", parseTimestamp: d("2026-09-13T04:10:00"), lineNumberInExtract: 9 },
];

function cmpText(a: unknown, b: string, op: FilterT["op"]) {
  const s = a == null ? "" : String(a).toUpperCase();
  const v = b.toUpperCase();
  switch (op) {
    case "contains": return s.includes(v);
    case "notContains": return !s.includes(v);
    case "equals": return s === v;
    case "startsWith": return s.startsWith(v);
    case "in": return v.split(",").map((x) => x.trim()).filter(Boolean).includes(s);
    default: return true;
  }
}

function dayOf(v: unknown): string | null {
  if (v == null) return null;
  return String(v).slice(0, 10);
}

function evalFilter(row: OpportunityRowT, f: FilterT): boolean {
  const field = FIELD_BY_KEY[f.field];
  if (!field) return true;
  const raw = row[f.field];
  if (f.op === "isEmpty") return raw == null || raw === "";
  if (f.op === "isNotEmpty") return !(raw == null || raw === "");
  const v = f.value ?? "";
  const v2 = f.value2 ?? "";
  switch (field.type) {
    case "text":
    case "clob":
      return cmpText(raw, v, f.op);
    case "flag":
      return String(raw ?? "").toUpperCase() === v.toUpperCase();
    case "number": {
      if (raw == null) return false;
      const n = Number(raw), a = Number(v), b = Number(v2);
      switch (f.op) {
        case "eq": return n === a;
        case "gt": return n > a;
        case "gte": return n >= a;
        case "lt": return n < a;
        case "lte": return n <= a;
        case "between": return n >= a && n <= b;
        default: return true;
      }
    }
    case "date":
    case "timestamp": {
      const day = dayOf(raw);
      if (!day) return false;
      switch (f.op) {
        case "on": return day === v;
        case "before": return day < v;
        case "after": return day > v;
        case "between": return day >= v && day <= v2;
        default: return true;
      }
    }
  }
}

const QUICK_FIELDS = ["title", "solicitationNumber", "noticeId", "departmentAgency", "subTier", "office", "awardee"];

export function evaluateSample(q: QueryT, filters: FilterT[]) {
  let rows = SAMPLE_ROWS.filter((r) => filters.every((f) => evalFilter(r, f)));
  if (q.quick.trim()) {
    const needle = q.quick.trim().toUpperCase();
    rows = rows.filter((r) => QUICK_FIELDS.some((k) => String(r[k] ?? "").toUpperCase().includes(needle)));
  }
  const field = FIELD_BY_KEY[q.sort];
  rows.sort((a, b) => {
    const x = a[q.sort], y = b[q.sort];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    const c = field?.type === "number" ? Number(x) - Number(y) : String(x).localeCompare(String(y));
    return q.dir === "asc" ? c : -c;
  });
  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(start, start + q.pageSize), total };
}

export function sampleById(id: number) {
  return SAMPLE_ROWS.find((r) => r.opportunityId === id) ?? null;
}
