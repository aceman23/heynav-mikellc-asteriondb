create table bid_opportunities
(
  opportunity_id                        number(12) primary key,
  notice_id                                varchar2(60) unique not null,
  title                                    varchar2(256) not null,
  solicitation_number                    varchar2(120),
  department_agency                        varchar2(512) not null,
  cgac                                    varchar2(10) not null,
  sub_tier                                varchar2(512),
  fpds_code                                varchar2(4),
  office                                varchar2(120),
  aac_code                                varchar2(8),
  posted_date                            date not null,
  type                                    varchar2(60) not null,
  base_type                                varchar2(60),
  archive_type                            varchar2(60),
  archive_date                            date,
  set_aside_code                        varchar2(8),
  set_aside                                varchar2(256),
  response_deadline                        timestamp,
  naics_code                            varchar2(6),
  classification_code                    varchar2(10),
  pop_street_address                    varchar2(256),
  pop_city                                varchar2(60),
  pop_state                                varchar2(30),
  pop_zip_code                            varchar2(12),
  pop_country                            varchar2(60),
  active                                varchar2(3),
  award_number                            varchar2(30),
  award_date                            date,
  award_amount                            number(12,2),
  awardee                                varchar2(256),
  primary_contact_title                    varchar2(60),
  primary_contact_fullname                varchar2(512),
  primary_contact_email                    varchar2(120),
  primary_contact_phone                    varchar2(60),
  primary_contact_fax                    varchar2(60),
  secondary_contact_title                varchar2(60),
  secondary_contact_fullname            varchar2(512),
  secondary_contact_email                varchar2(120),
  secondary_contact_phone                varchar2(60),
  secondary_contact_fax                    varchar2(60),
  organization_type                        varchar2(20),
  state                                    varchar2(2),
  city                                    varchar2(60),
  zip_code                                varchar2(12),
  country_code                            varchar2(5),
  additional_info_link                    varchar2(256),
  link                                    varchar2(256),
  description                            clob,
  rejected_by_user                         varchar2(1) default 'N' not null
    constraint rejected_chk check (rejected_by_user in ('Y', 'N')),
  parse_timestamp                        timestamp default systimestamp at time zone 'utc' not null,
  line_number_in_extract                number(6) not null
) lob (description) store as securefile (nocache filesystem_like_logging);

-- Indexes for the query screen's most common predicates and sort keys.
create index bid_opp_posted_ix        on bid_opportunities (posted_date);
create index bid_opp_deadline_ix      on bid_opportunities (response_deadline);
create index bid_opp_naics_ix         on bid_opportunities (naics_code);
create index bid_opp_set_aside_ix     on bid_opportunities (set_aside_code);
create index bid_opp_pop_state_ix     on bid_opportunities (pop_state);
create index bid_opp_active_ix        on bid_opportunities (active, rejected_by_user);
create index bid_opp_agency_ix        on bid_opportunities (upper(department_agency));
create index bid_opp_title_ix         on bid_opportunities (upper(title));

-- Optional, recommended once volume grows: an Oracle Text index on description
-- lets "description contains" use CONTAINS() instead of INSTR() over the CLOB.
-- create index bid_opp_desc_ctx on bid_opportunities (description) indextype is ctxsys.context parameters ('sync (on commit)');
