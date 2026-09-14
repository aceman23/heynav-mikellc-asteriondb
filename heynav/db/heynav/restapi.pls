create or replace
package body restapi as

  function query_bid_opportunities
  (
    p_json_parameters                 json_object_t
  )
  return clob

  is

  begin

    return heynav_query.query_bid_opportunities(
      p_quick     => p_json_parameters.get_string('quick'),
      p_filters   => p_json_parameters.get_array('filters'),
      p_sort      => p_json_parameters.get_string('sort'),
      p_dir       => p_json_parameters.get_string('dir'),
      p_page      => p_json_parameters.get_number('page'),
      p_page_size => p_json_parameters.get_number('pageSize'));

  end query_bid_opportunities;

  function get_bid_opportunity
  (
    p_json_parameters                 json_object_t
  )
  return clob

  is

  begin

    return heynav_query.get_bid_opportunity(db_twig.get_number(p_json_parameters, 'opportunityId'));

  end get_bid_opportunity;

  procedure validate_session
  (
    p_json_parameters                 json_object_t,
    p_required_authorization_level    middle_tier_map.required_authorization_level%type,
    p_allow_blocked_session           middle_tier_map.allow_blocked_session%type
  )

  is

  begin

    icam.validate_session(p_json_parameters, p_required_authorization_level, p_allow_blocked_session);

  end validate_session;

end restapi;
/
show errors
