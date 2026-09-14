// Field catalog for BID_OPPORTUNITIES — the single source of truth for the
// query screen. `key` is the JSON name used over DbTwig; `column` is the
// Oracle column. The PL/SQL side (db/heynav/heynav_query.pls) carries the
// same list as its whitelist; keep them in sync.

export type FieldTypeT = "text" | "number" | "date" | "timestamp" | "flag" | "clob";

export type FieldT = {
  key: string;
  column: string;
  label: string;
  type: FieldTypeT;
  group: string;
  /** Shown as a datalist; free text is still allowed. */
  suggestions?: string[];
  /** For flag fields: [value, label] pairs. */
  flagValues?: [string, string][];
  /** In the default result columns. */
  defaultVisible?: boolean;
  width?: number;
};

// SAM.gov notice types and set-aside codes, as they appear in the extract.
export const NOTICE_TYPES = [
  "Solicitation",
  "Presolicitation",
  "Combined Synopsis/Solicitation",
  "Sources Sought",
  "Special Notice",
  "Award Notice",
  "Justification",
  "Sale of Surplus Property",
  "Intent to Bundle Requirements (DoD-Funded)",
];

export const SET_ASIDE_CODES = [
  "SBA", "SBP", "8A", "8AN", "HZC", "HZS", "SDVOSBC", "SDVOSBS", "WOSB", "WOSBSS",
  "EDWOSB", "EDWOSBSS", "LAS", "IEE", "ISBEE", "BICiv", "VSA", "VSS",
];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","PR","GU","VI","AS","MP",
];

export const FIELDS: FieldT[] = [
  // Notice
  { key: "noticeId", column: "notice_id", label: "Notice ID", type: "text", group: "Notice", defaultVisible: true, width: 150 },
  { key: "title", column: "title", label: "Title", type: "text", group: "Notice", defaultVisible: true, width: 340 },
  { key: "solicitationNumber", column: "solicitation_number", label: "Solicitation #", type: "text", group: "Notice", defaultVisible: true, width: 170 },
  { key: "type", column: "type", label: "Notice type", type: "text", group: "Notice", suggestions: NOTICE_TYPES, defaultVisible: true, width: 180 },
  { key: "baseType", column: "base_type", label: "Base type", type: "text", group: "Notice", suggestions: NOTICE_TYPES },
  { key: "active", column: "active", label: "Active", type: "flag", group: "Notice", flagValues: [["Yes", "Yes"], ["No", "No"]], defaultVisible: true, width: 80 },
  { key: "postedDate", column: "posted_date", label: "Posted", type: "date", group: "Notice", defaultVisible: true, width: 110 },
  { key: "responseDeadline", column: "response_deadline", label: "Response deadline", type: "timestamp", group: "Notice", defaultVisible: true, width: 150 },
  { key: "archiveType", column: "archive_type", label: "Archive type", type: "text", group: "Notice", suggestions: ["auto15", "auto30", "autocustom", "manual"] },
  { key: "archiveDate", column: "archive_date", label: "Archive date", type: "date", group: "Notice" },
  { key: "link", column: "link", label: "SAM.gov link", type: "text", group: "Notice" },
  { key: "additionalInfoLink", column: "additional_info_link", label: "Additional info link", type: "text", group: "Notice" },
  { key: "description", column: "description", label: "Description", type: "clob", group: "Notice" },

  // Classification
  { key: "naicsCode", column: "naics_code", label: "NAICS", type: "text", group: "Classification", defaultVisible: true, width: 90 },
  { key: "classificationCode", column: "classification_code", label: "PSC / classification", type: "text", group: "Classification" },
  { key: "setAsideCode", column: "set_aside_code", label: "Set-aside code", type: "text", group: "Classification", suggestions: SET_ASIDE_CODES, defaultVisible: true, width: 120 },
  { key: "setAside", column: "set_aside", label: "Set-aside", type: "text", group: "Classification" },

  // Agency
  { key: "departmentAgency", column: "department_agency", label: "Department / agency", type: "text", group: "Agency", defaultVisible: true, width: 220 },
  { key: "subTier", column: "sub_tier", label: "Sub-tier", type: "text", group: "Agency" },
  { key: "office", column: "office", label: "Office", type: "text", group: "Agency" },
  { key: "cgac", column: "cgac", label: "CGAC", type: "text", group: "Agency" },
  { key: "fpdsCode", column: "fpds_code", label: "FPDS code", type: "text", group: "Agency" },
  { key: "aacCode", column: "aac_code", label: "AAC code", type: "text", group: "Agency" },
  { key: "organizationType", column: "organization_type", label: "Organization type", type: "text", group: "Agency", suggestions: ["OFFICE", "DEPARTMENT", "SUB-TIER"] },
  { key: "state", column: "state", label: "Office state", type: "text", group: "Agency", suggestions: US_STATES },
  { key: "city", column: "city", label: "Office city", type: "text", group: "Agency" },
  { key: "zipCode", column: "zip_code", label: "Office ZIP", type: "text", group: "Agency" },
  { key: "countryCode", column: "country_code", label: "Office country", type: "text", group: "Agency" },

  // Place of performance
  { key: "popStreetAddress", column: "pop_street_address", label: "PoP street", type: "text", group: "Place of performance" },
  { key: "popCity", column: "pop_city", label: "PoP city", type: "text", group: "Place of performance" },
  { key: "popState", column: "pop_state", label: "PoP state", type: "text", group: "Place of performance", suggestions: US_STATES, defaultVisible: true, width: 90 },
  { key: "popZipCode", column: "pop_zip_code", label: "PoP ZIP", type: "text", group: "Place of performance" },
  { key: "popCountry", column: "pop_country", label: "PoP country", type: "text", group: "Place of performance" },

  // Award
  { key: "awardNumber", column: "award_number", label: "Award number", type: "text", group: "Award" },
  { key: "awardDate", column: "award_date", label: "Award date", type: "date", group: "Award" },
  { key: "awardAmount", column: "award_amount", label: "Award amount", type: "number", group: "Award" },
  { key: "awardee", column: "awardee", label: "Awardee", type: "text", group: "Award" },

  // Contacts
  { key: "primaryContactFullname", column: "primary_contact_fullname", label: "Primary contact", type: "text", group: "Contacts" },
  { key: "primaryContactTitle", column: "primary_contact_title", label: "Primary contact title", type: "text", group: "Contacts" },
  { key: "primaryContactEmail", column: "primary_contact_email", label: "Primary contact email", type: "text", group: "Contacts" },
  { key: "primaryContactPhone", column: "primary_contact_phone", label: "Primary contact phone", type: "text", group: "Contacts" },
  { key: "primaryContactFax", column: "primary_contact_fax", label: "Primary contact fax", type: "text", group: "Contacts" },
  { key: "secondaryContactFullname", column: "secondary_contact_fullname", label: "Secondary contact", type: "text", group: "Contacts" },
  { key: "secondaryContactTitle", column: "secondary_contact_title", label: "Secondary contact title", type: "text", group: "Contacts" },
  { key: "secondaryContactEmail", column: "secondary_contact_email", label: "Secondary contact email", type: "text", group: "Contacts" },
  { key: "secondaryContactPhone", column: "secondary_contact_phone", label: "Secondary contact phone", type: "text", group: "Contacts" },
  { key: "secondaryContactFax", column: "secondary_contact_fax", label: "Secondary contact fax", type: "text", group: "Contacts" },

  // Pipeline / internal
  { key: "opportunityId", column: "opportunity_id", label: "Opportunity ID", type: "number", group: "Pipeline" },
  { key: "rejectedByUser", column: "rejected_by_user", label: "Rejected by user", type: "flag", group: "Pipeline", flagValues: [["Y", "Yes"], ["N", "No"]] },
  { key: "parseTimestamp", column: "parse_timestamp", label: "Parsed (UTC)", type: "timestamp", group: "Pipeline" },
  { key: "lineNumberInExtract", column: "line_number_in_extract", label: "Line in extract", type: "number", group: "Pipeline" },
];

export const FIELD_BY_KEY: Record<string, FieldT> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));
export const GROUPS = Array.from(new Set(FIELDS.map((f) => f.group)));
export const DEFAULT_COLUMNS = FIELDS.filter((f) => f.defaultVisible).map((f) => f.key);
