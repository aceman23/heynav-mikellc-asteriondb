-- DbTwig middle-tier map for the heyNav service.
-- (api_name, entry type, PL/SQL entry point, service, required authorization level, allow blocked session)

insert into middle_tier_map values ('queryBidOpportunities', 'function', 'restapi.query_bid_opportunities', 'heyNav', 'user', 'N');
insert into middle_tier_map values ('getBidOpportunity',     'function', 'restapi.get_bid_opportunity',     'heyNav', 'user', 'N');

commit;
