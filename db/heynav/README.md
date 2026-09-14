# heyNav DbTwig service

Database side of the Opportunities query screen. Everything the web app sends
is validated against a whitelist here; only column names from that list and
fixed operator templates ever enter the SQL text.

## Files

| File | Purpose |
| --- | --- |
| `bid_opportunities.sql` | The table (as supplied) plus indexes for common predicates |
| `heynav_query.sql/.pls` | Query package: whitelist, predicate builder, paging, JSON output |
| `restapi.sql/.pls` | DbTwig entry points (`p_json_parameters json_object_t` → CLOB) and `validate_session` |
| `dbTwigData.sql` | `middle_tier_map` rows for the two APIs |
| `install.sql` | Runs the above and registers the `heyNav` service |

## API contract

`POST heyNav/queryBidOpportunities` (session required)

```json
{
  "quick": "cybersecurity",
  "filters": [
    { "field": "active", "op": "is", "value": "Yes" },
    { "field": "responseDeadline", "op": "after", "value": "2026-09-13" },
    { "field": "setAsideCode", "op": "in", "value": "SDVOSBC,SDVOSBS", "values": ["SDVOSBC", "SDVOSBS"] },
    { "field": "awardAmount", "op": "between", "value": "100000", "value2": "5000000" }
  ],
  "sort": "postedDate", "dir": "desc", "page": 1, "pageSize": 25
}
```

Returns `{ "total": n, "page": 1, "pageSize": 25, "rows": [ { "opportunityId": …, "noticeId": …, … } ] }`.
`rows` omits `description`; dates are `YYYY-MM-DD`, timestamps `YYYY-MM-DDTHH:MI:SS`.

`POST heyNav/getBidOpportunity` (session required) — `{ "opportunityId": 1001 }` → the full row including `description`.

Field keys and operators are defined once in `src/app/workspace/opportunities/fields.ts`
and `queryModel.ts`; the whitelist at the bottom of `heynav_query.pls` must match.

Operators by type: text `contains notContains equals startsWith in isEmpty isNotEmpty`;
clob `contains notContains isEmpty isNotEmpty`; number `eq gt gte lt lte between isEmpty
isNotEmpty`; date/timestamp `on before after between isEmpty isNotEmpty` (day-granular,
values `YYYY-MM-DD`); flag `is`. Text matching is case-insensitive.

## Installing

Inferred from how `database-os` registers its `dbos` service; confirm against the DbTwig
install documentation for your release.

As the DBA, for the heyNav schema owner (`heynav`) and the DbTwig owner (`dbtwig`):

```sql
create user heynav identified by "…" default tablespace users quota unlimited on users;
grant create session, create table, create procedure, create sequence to heynav;
grant execute on dbtwig.db_twig to heynav;
grant execute on dbtwig_icam.icam to heynav;           -- session validation
create or replace synonym heynav.db_twig for dbtwig.db_twig;
create or replace synonym heynav.icam    for dbtwig_icam.icam;
create or replace synonym heynav.middle_tier_map for dbtwig.middle_tier_map;   -- or the service-owned copy, per DbTwig docs
```

Then as `heynav`:

```
sqlplus heynav/…@db @install
```

And after install, as the DBA:

```sql
grant execute on heynav.restapi to dbtwig;
grant select on heynav.middle_tier_map to dbtwig;      -- if the map is service-owned
```

Point the web app at it with `HEYNAV_SAMPLE_DATA=0` in `.env.local`.

## Error codes

`-20200` unknown field · `-20201` operator not valid for field · `-20202` opportunity not found.
DbTwig returns these as `errorMessage` in the JSON body; the screen shows them inline.
