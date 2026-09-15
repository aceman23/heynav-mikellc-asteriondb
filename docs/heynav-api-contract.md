# Hey Nav ↔ heyNav service — API contract

What the Hey Nav web app sends to, and expects back from, the `heyNav` DbTwig service.
All calls are `POST dbTwig/heyNav/<entryPoint>` with a JSON body and `Authorization: Bearer <sessionId>`.
The app never touches tables; every read and write goes through these entry points.

`db/heynav/` contains a reference PL/SQL implementation of the first two; use it or replace it —
the contract below is what the screen is built against.

Conventions the app relies on:
- Success: HTTP 2xx, JSON body as described.
- Failure: non-2xx with `{ "errorMessage": "…" }` — the app shows `errorMessage` inline.
- Dates as `YYYY-MM-DD`; timestamps as `YYYY-MM-DDTHH:MI:SS` (no zone; treated as given).
- JSON keys are camelCase; the full column ↔ key map is in `src/app/workspace/opportunities/fields.ts`.

---

## queryBidOpportunities  — implemented in the app, waiting on the entry point

Request:
```json
{
  "quick": "cybersecurity",                 // optional; matches title, solicitation_number, notice_id,
                                            //   department_agency, sub_tier, office, awardee (case-insensitive)
  "filters": [                              // AND-ed; may be empty
    { "field": "active",           "op": "is",        "value": "Yes" },
    { "field": "responseDeadline", "op": "after",     "value": "2026-09-13" },
    { "field": "naicsCode",        "op": "startsWith","value": "5415" },
    { "field": "setAsideCode",     "op": "in",        "value": "SDVOSBC,SDVOSBS",
                                                       "values": ["SDVOSBC", "SDVOSBS"] },
    { "field": "awardAmount",      "op": "between",   "value": "100000", "value2": "5000000" },
    { "field": "description",      "op": "contains",  "value": "zero trust" },
    { "field": "awardee",          "op": "isNotEmpty" }
  ],
  "sort": "postedDate",                     // any non-CLOB field key; default postedDate
  "dir": "desc",                            // asc | desc
  "page": 1,
  "pageSize": 25                            // 25 | 50 | 100
}
```

Operators by field type:

| Type | Fields | Operators |
| --- | --- | --- |
| text | most columns | `contains` `notContains` `equals` `startsWith` `in` `isEmpty` `isNotEmpty` |
| clob | `description` | `contains` `notContains` `isEmpty` `isNotEmpty` |
| number | `opportunityId` `awardAmount` `lineNumberInExtract` | `eq` `gt` `gte` `lt` `lte` `between` `isEmpty` `isNotEmpty` |
| date / timestamp | `postedDate` `archiveDate` `awardDate` `responseDeadline` `parseTimestamp` | `on` `before` `after` `between` `isEmpty` `isNotEmpty` — day-granular, values `YYYY-MM-DD` |
| flag | `active` (Yes/No) `rejectedByUser` (Y/N) | `is` |

Text matching is case-insensitive. `in` carries both the raw comma string (`value`) and the split list (`values`).

Response:
```json
{
  "total": 1834,                            // count of all matches, not just this page
  "page": 1,
  "pageSize": 25,
  "rows": [
    {
      "opportunityId": 1001,
      "noticeId": "…", "title": "…", "solicitationNumber": "…",
      "departmentAgency": "…", "cgac": "…", "subTier": "…", "fpdsCode": "…", "office": "…", "aacCode": "…",
      "postedDate": "2026-09-02", "type": "Solicitation", "baseType": "…", "archiveType": "…", "archiveDate": null,
      "setAsideCode": "SDVOSBC", "setAside": "…", "responseDeadline": "2026-10-01T16:00:00",
      "naicsCode": "541512", "classificationCode": "D310",
      "popStreetAddress": null, "popCity": "…", "popState": "MD", "popZipCode": "…", "popCountry": "USA",
      "active": "Yes", "awardNumber": null, "awardDate": null, "awardAmount": null, "awardee": null,
      "primaryContactTitle": "…", "primaryContactFullname": "…", "primaryContactEmail": "…",
      "primaryContactPhone": "…", "primaryContactFax": null,
      "secondaryContactTitle": null, "secondaryContactFullname": null, "secondaryContactEmail": null,
      "secondaryContactPhone": null, "secondaryContactFax": null,
      "organizationType": "OFFICE", "state": "MD", "city": "…", "zipCode": "…", "countryCode": "USA",
      "additionalInfoLink": null, "link": "https://sam.gov/opp/…/view",
      "rejectedByUser": "N", "parseTimestamp": "2026-09-03T04:10:00", "lineNumberInExtract": 12
    }
  ]
}
```
`rows` omits `description` (it's fetched per row below). Null columns come back as `null`, not omitted.

## getBidOpportunity  — implemented in the app, waiting on the entry point

Request: `{ "opportunityId": 1001 }`
Response: one object with every column including `description`, same keys and formats as a row above.
Not found → non-2xx with `errorMessage`.

---

## Documents (Vault) — the part still to agree

Uploads already work through `dgBunker/uploadFiles` and return `{ "objectId": "…" }`.
What Hey Nav needs next, in whatever form fits the AsterionDB model:

**A. Attach an uploaded object to something.** After `uploadFiles` returns an objectId, the app
needs to record what it belongs to — an opportunity, a workspace/pursuit, or the corporate library —
and what kind of document it is (solicitation, amendment, attachment, past performance, …).
Proposed heyNav entry point:
```json
attachDocument   { "objectId": "…", "opportunityId": 1001 | null, "workspaceId": "…" | null,
                   "documentType": "solicitation", "displayName": "W91ZLK-26-R-0001.pdf" }
```
(If you'd rather the app pass these as extra multipart fields on `uploadFiles` so the bunker
records them in one step, that works too — say which.)

**B. List documents for an opportunity / workspace.**
```json
getDocuments     { "opportunityId": 1001 }   →  { "documents": [ { "objectId", "displayName",
                                                   "documentType", "size", "uploadedBy", "uploadedAt" } ] }
```

**C. Open or download a stored object by objectId** in the browser, e.g. the solicitation PDF.
Is there a dgBunker entry point or URL pattern that streams an object's bytes for a given
objectId under the caller's session — and can it be linked directly (`<a href>`/`<iframe>`),
or does it have to be proxied through the Hey Nav server like uploads are?

**D. Replace a version.** `uploadFiles` with `newVersion=Y` + `objectId` is already wired;
confirm the returned objectId is the same object (new version) rather than a new object.

---

## Session

Already working end to end:
- `POST icam/createUserSession { identification, password }` → `sessionId`, `sessionStatus`, `firstName`, `middleName`, `lastName`, `emailAddress`
- `GET  icam/terminateUserSession` (bearer)
- Anonymous calls send **no** `Authorization` header (ICAM raises ORA-06502 on `Bearer null`).
