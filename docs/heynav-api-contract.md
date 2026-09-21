# Hey Nav ↔ heyNav service — API contract

What the Hey Nav web app sends to, and expects back from, the `heyNav` DbTwig service.
All calls are `POST dbTwig/heyNav/<entryPoint>` with a JSON body and `Authorization: Bearer <sessionId>`.
The app never touches tables; every read and write goes through these entry points.

`db/heynav/` contains a reference PL/SQL implementation of the first two; use it or replace it —
the contract below is what the screen is built against.

Conventions the app relies on:
- Success: HTTP 2xx, JSON body as described.
- Failure: non-2xx with `{ "status": false, "errorCode": n, "errorMessage": "…" }` (DbTwig's envelope) —
  the app shows `errorMessage` inline.
- Expired session: HTTP 403 with `errorCode` 20002 ("This session has timed out") — the app clears its
  cookie and returns the user to sign-in. ICAM idle timeout is 1 day and every call resets it, so
  no keep-alive is needed.
- Dates as `YYYY-MM-DD`; timestamps as `YYYY-MM-DDTHH:MI:SS` (no zone; treated as given).
- JSON keys are camelCase; the full column ↔ key map is in `src/app/workspace/opportunities/fields.ts`.

---

## getBidOpportunities  — live on cloud-test (no parameters, limited columns)
The app's `basic` mode calls this, normalizes column names (any of `noticeId` / `notice_id` /
`NOTICE_ID`) and Oracle date formats, and filters/sorts/pages in the app. Any envelope works
(`[…]` or `{ "anything": […] }`). Columns it doesn't return show as "—". When
`queryBidOpportunities` below exists, the app switches to it with one env var.

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

## setOpportunityFlags  — implemented in the app, waiting on the entry point

Triage: mark an opportunity as interesting, or reject it. Two independent Y/N flags, matching
the existing `rejected_by_user` column. Suggested DDL: `alter table bid_opportunities add
(flagged_by_user char(1) default 'N' not null)`; the app also reads `flaggedByUser` in query
rows and can filter on it (`{ "field": "flaggedByUser", "op": "is", "value": "Y" }`).

Request — either or both keys:
```json
{ "opportunityId": 1001, "flaggedByUser": "Y" }
{ "opportunityId": 1001, "rejectedByUser": "N" }
```
Response — the row's flags after the change:
```json
{ "opportunityId": 1001, "flaggedByUser": "Y", "rejectedByUser": "N" }
```
Who flagged and when is worth recording server-side (`flagged_by`, `flagged_at`) for the audit
stream; the app doesn't need them back yet.

## Documents  — implemented in the app, waiting on the entry points

Upload is already live through `dgBunker/uploadFiles` → `{ "objectId" }`. The app then records
what the object belongs to with `attachDocument`, and lists with `getDocuments`. Suggested table
in the heyNav schema: `documents (object_id, opportunity_id null, workspace_id null,
display_name, document_type, size_bytes, uploaded_by, uploaded_at)`.

### attachDocument
Request:
```json
{ "objectId": "…", "opportunityId": 1001, "displayName": "W91ZLK-26-R-0001.pdf",
  "documentType": "attachment", "size": 1834221 }
```
`opportunityId` may be `null` for library documents. `documentType` is free text for now
(`solicitation`, `amendment`, `attachment`, `past-performance`, …).

Response — the stored record:
```json
{ "objectId": "…", "opportunityId": 1001, "displayName": "…", "documentType": "…",
  "size": 1834221, "uploadedBy": "AsterionDB Administrator", "uploadedAt": "2026-09-16T16:46:48" }
```

### getDocuments
Request: `{ "opportunityId": 1001 }` (`null` → every document the caller may see)
Response: `{ "documents": [ …records as above… ] }`, newest first.

### Still open
- **Opening an object** by objectId in the browser (view the PDF): is there a dgBunker URL
  pattern the app can link to under the caller's session, or must it be proxied like uploads?
- **New versions**: `uploadFiles` with `newVersion=Y` + `objectId` is wired; confirm the same
  objectId comes back.

## askQuestion  — first RAG cut; implemented in the app, waiting on the entry point

One question, one grounded answer, citations to the documents it came from. Scope is either one
opportunity's documents or everything the caller may see. Chunking, embedding, and retrieval are
entirely on the database side; the app never sees document contents except through citations.

Request:
```json
{ "question": "What are the evaluation criteria?", "opportunityId": 1001 }   // opportunityId may be null
```
Response:
```json
{
  "answer": "Proposals are evaluated on technical approach, past performance, and price …",
  "citations": [
    { "objectId": "…", "displayName": "W91ZLK-26-R-0001.pdf", "snippet": "Section M.2 — Evaluation factors …" }
  ]
}
```
`citations` may be empty when nothing relevant was found — the app shows the answer as-is, so the
answer text should say so rather than guess. Long-running: fine for now; the app waits.

---

## Session

Already working end to end:
- `POST icam/createUserSession { identification, password }` → `sessionId`, `sessionStatus`, `firstName`, `middleName`, `lastName`, `emailAddress`
- `GET  icam/terminateUserSession` (bearer)
- Anonymous calls send **no** `Authorization` header (ICAM raises ORA-06502 on `Bearer null`).
