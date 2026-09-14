create or replace
package heynav_query as

-- Query layer for BID_OPPORTUNITIES. The field whitelist here mirrors
-- src/app/workspace/opportunities/fields.ts in the web app: same keys, same
-- types. Dynamic SQL is assembled only from whitelisted column names and
-- fixed operator templates; every user-supplied value arrives through a
-- single JSON bind, so nothing from the client is ever concatenated into SQL.

-- Error codes: DbTwig reserves -20000..-20199. heyNav starts at -20200.
  UNKNOWN_FIELD                     constant pls_integer := -20200;
  UNKNOWN_OPERATOR                  constant pls_integer := -20201;
  OPPORTUNITY_NOT_FOUND             constant pls_integer := -20202;

  function query_bid_opportunities
  (
    p_quick                           varchar2,
    p_filters                         json_array_t,
    p_sort                            varchar2,
    p_dir                             varchar2,
    p_page                            pls_integer,
    p_page_size                       pls_integer
  )
  return clob;

  function get_bid_opportunity
  (
    p_opportunity_id                  bid_opportunities.opportunity_id%type
  )
  return clob;

end heynav_query;
/
show errors
