create or replace
package restapi as

-- DbTwig entry points for the heyNav service. Each takes the JSON parameters
-- DbTwig assembled from the HTTP request (body fields plus the session id it
-- extracted from the bearer token) and returns a CLOB of JSON.

  function query_bid_opportunities
  (
    p_json_parameters                 json_object_t
  )
  return clob;

  function get_bid_opportunity
  (
    p_json_parameters                 json_object_t
  )
  return clob;

  procedure validate_session
  (
    p_json_parameters                 json_object_t,
    p_required_authorization_level    middle_tier_map.required_authorization_level%type,
    p_allow_blocked_session           middle_tier_map.allow_blocked_session%type
  );

end restapi;
/
show errors
