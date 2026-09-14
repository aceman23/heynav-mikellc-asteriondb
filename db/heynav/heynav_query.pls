create or replace
package body heynav_query as

  type field_t is record
  (
    column_name                       varchar2(30),
    data_type                         varchar2(10)   -- text | clob | number | date | timestamp | flag
  );
  type field_map_t is table of field_t index by varchar2(40);
  type key_list_t  is table of varchar2(40);

  g_fields                            field_map_t;
  g_keys                              key_list_t := key_list_t();

  MAX_PAGE_SIZE                       constant pls_integer := 200;

  procedure reg(p_key varchar2, p_column varchar2, p_type varchar2) is
  begin
    g_fields(p_key).column_name := p_column;
    g_fields(p_key).data_type   := p_type;
    g_keys.extend; g_keys(g_keys.count) := p_key;
  end reg;

  -- Expression that reads attribute p_attr of the p_index-th filter from the
  -- single :filters bind. p_index is a server-generated integer, never client text.
  function jv(p_index pls_integer, p_attr varchar2 default 'value') return varchar2 is
  begin
    return 'json_value(:filters, ''$['||p_index||'].'||p_attr||''')';
  end jv;

  function jd(p_index pls_integer, p_attr varchar2 default 'value') return varchar2 is
  begin
    return 'to_date('||jv(p_index, p_attr)||', ''YYYY-MM-DD'')';
  end jd;

  function jn(p_index pls_integer, p_attr varchar2 default 'value') return varchar2 is
  begin
    return 'to_number('||jv(p_index, p_attr)||')';
  end jn;

  -- "is any of" reads the filter's values[] array.
  function jin(p_index pls_integer) return varchar2 is
  begin
    return '(select upper(trim(v)) from json_table(:filters, ''$['||p_index||'].values[*]'' columns (v varchar2(512) path ''$'')))';
  end jin;

  function predicate(p_index pls_integer, p_key varchar2, p_op varchar2) return varchar2 is
    l_col                             varchar2(30);
    l_type                            varchar2(10);
  begin
    if not g_fields.exists(p_key) then
      raise_application_error(UNKNOWN_FIELD, 'Unknown field: '||p_key);
    end if;
    l_col  := g_fields(p_key).column_name;
    l_type := g_fields(p_key).data_type;

    if p_op = 'isEmpty'    then return l_col||' is null'; end if;
    if p_op = 'isNotEmpty' then return l_col||' is not null'; end if;

    case l_type
      when 'text' then
        case p_op
          when 'contains'    then return 'upper('||l_col||') like ''%''||upper('||jv(p_index)||')||''%''';
          when 'notContains' then return '('||l_col||' is null or upper('||l_col||') not like ''%''||upper('||jv(p_index)||')||''%'')';
          when 'equals'      then return 'upper('||l_col||') = upper('||jv(p_index)||')';
          when 'startsWith'  then return 'upper('||l_col||') like upper('||jv(p_index)||')||''%''';
          when 'in'          then return 'upper('||l_col||') in '||jin(p_index);
          else null;
        end case;
      when 'clob' then
        case p_op
          when 'contains'    then return 'instr(upper('||l_col||'), upper('||jv(p_index)||')) > 0';
          when 'notContains' then return '('||l_col||' is null or instr(upper('||l_col||'), upper('||jv(p_index)||')) = 0)';
          else null;
        end case;
      when 'number' then
        case p_op
          when 'eq'      then return l_col||' = '||jn(p_index);
          when 'gt'      then return l_col||' > '||jn(p_index);
          when 'gte'     then return l_col||' >= '||jn(p_index);
          when 'lt'      then return l_col||' < '||jn(p_index);
          when 'lte'     then return l_col||' <= '||jn(p_index);
          when 'between' then return l_col||' between '||jn(p_index)||' and '||jn(p_index, 'value2');
          else null;
        end case;
      when 'date' then null; -- handled below with timestamp
      when 'timestamp' then null;
      when 'flag' then
        if p_op = 'is' then return 'upper('||l_col||') = upper('||jv(p_index)||')'; end if;
      else null;
    end case;

    -- Date and timestamp columns: day-granular, index-friendly range forms.
    if l_type in ('date', 'timestamp') then
      case p_op
        when 'on'      then return '('||l_col||' >= '||jd(p_index)||' and '||l_col||' < '||jd(p_index)||' + 1)';
        when 'before'  then return l_col||' < '||jd(p_index);
        when 'after'   then return l_col||' >= '||jd(p_index)||' + 1';
        when 'between' then return '('||l_col||' >= '||jd(p_index)||' and '||l_col||' < '||jd(p_index, 'value2')||' + 1)';
        else null;
      end case;
    end if;

    raise_application_error(UNKNOWN_OPERATOR, 'Operator '||p_op||' is not valid for field '||p_key);
  end predicate;

  -- JSON select-list entry for one field, formatted for the web app.
  function json_pair(p_key varchar2) return varchar2 is
    l_col                             varchar2(30) := g_fields(p_key).column_name;
  begin
    return ''''||p_key||''' value '||
      case g_fields(p_key).data_type
        when 'date'      then 'to_char('||l_col||', ''YYYY-MM-DD'')'
        when 'timestamp' then 'to_char('||l_col||', ''YYYY-MM-DD"T"HH24:MI:SS'')'
        else l_col
      end;
  end json_pair;

  function query_bid_opportunities
  (
    p_quick                           varchar2,
    p_filters                         json_array_t,
    p_sort                            varchar2,
    p_dir                             varchar2,
    p_page                            pls_integer,
    p_page_size                       pls_integer
  )
  return clob

  is

    l_filter                          json_object_t;
    l_where                           clob := ' where 1 = 1';
    l_select                          clob;
    l_sql                             clob;
    l_sort_col                        varchar2(30);
    l_dir                             varchar2(4) := case when lower(p_dir) = 'asc' then 'asc' else 'desc' end;
    l_page                            pls_integer := greatest(nvl(p_page, 1), 1);
    l_page_size                       pls_integer := least(greatest(nvl(p_page_size, 25), 1), MAX_PAGE_SIZE);
    l_uses_filters                    boolean := false;
    l_uses_quick                      boolean := p_quick is not null;
    l_cursor                          pls_integer;
    l_rows                            pls_integer;
    l_result                          clob;

  begin

    -- Filters (AND-ed).
    if p_filters is not null then
      for i in 0 .. p_filters.get_size - 1 loop
        l_filter := treat(p_filters.get(i) as json_object_t);
        l_where := l_where||' and '||predicate(i, l_filter.get_string('field'), l_filter.get_string('op'));
        l_uses_filters := true;
      end loop;
    end if;

    -- Quick search across the identifying text columns.
    if l_uses_quick then
      l_where := l_where||' and (upper(title) like :quick or upper(solicitation_number) like :quick'||
        ' or upper(notice_id) like :quick or upper(department_agency) like :quick or upper(sub_tier) like :quick'||
        ' or upper(office) like :quick or upper(awardee) like :quick)';
    end if;

    -- Sort column from the whitelist only.
    if p_sort is not null and g_fields.exists(p_sort) and g_fields(p_sort).data_type <> 'clob' then
      l_sort_col := g_fields(p_sort).column_name;
    else
      l_sort_col := 'posted_date';
    end if;

    -- Select list: every whitelisted non-CLOB field, as a JSON object per row.
    for i in 1 .. g_keys.count loop
      if g_fields(g_keys(i)).data_type <> 'clob' then
        l_select := l_select||case when l_select is null then '' else ', ' end||json_pair(g_keys(i));
      end if;
    end loop;

    l_sql :=
      'select json_object('||
      '  ''total'' value nvl(max(total), 0),'||
      '  ''page'' value :page,'||
      '  ''pageSize'' value :page_size,'||
      '  ''rows'' value json_arrayagg(json_object('||l_select||' returning clob) order by rn returning clob)'||
      '  returning clob)'||
      ' from (select rownum rn, x.* from ('||
      '   select count(*) over () total, b.* from bid_opportunities b'||l_where||
      '   order by '||l_sort_col||' '||l_dir||' nulls last, opportunity_id'||
      '   offset :off rows fetch next :lim rows only) x)';

    -- DBMS_SQL binds each named placeholder once, however many times it appears.
    l_cursor := dbms_sql.open_cursor;
    dbms_sql.parse(l_cursor, l_sql, dbms_sql.native);
    if l_uses_filters then dbms_sql.bind_variable(l_cursor, ':filters', p_filters.to_clob); end if;
    if l_uses_quick   then dbms_sql.bind_variable(l_cursor, ':quick', '%'||upper(p_quick)||'%'); end if;
    dbms_sql.bind_variable(l_cursor, ':page', l_page);
    dbms_sql.bind_variable(l_cursor, ':page_size', l_page_size);
    dbms_sql.bind_variable(l_cursor, ':off', (l_page - 1) * l_page_size);
    dbms_sql.bind_variable(l_cursor, ':lim', l_page_size);
    dbms_sql.define_column(l_cursor, 1, l_result);
    l_rows := dbms_sql.execute_and_fetch(l_cursor);
    dbms_sql.column_value(l_cursor, 1, l_result);
    dbms_sql.close_cursor(l_cursor);

    return l_result;

  exception
    when others then
      if dbms_sql.is_open(l_cursor) then dbms_sql.close_cursor(l_cursor); end if;
      raise;

  end query_bid_opportunities;

  function get_bid_opportunity
  (
    p_opportunity_id                  bid_opportunities.opportunity_id%type
  )
  return clob

  is

    l_select                          clob;
    l_sql                             clob;
    l_result                          clob;

  begin

    for i in 1 .. g_keys.count loop
      l_select := l_select||case when l_select is null then '' else ', ' end||json_pair(g_keys(i));
    end loop;

    l_sql := 'select json_object('||l_select||' returning clob) from bid_opportunities where opportunity_id = :id';

    execute immediate l_sql into l_result using p_opportunity_id;
    return l_result;

  exception
    when no_data_found then
      raise_application_error(OPPORTUNITY_NOT_FOUND, 'Opportunity '||p_opportunity_id||' was not found.');

  end get_bid_opportunity;

begin
  -- Whitelist. Order here is the order of keys in every JSON row.
  reg('opportunityId',            'opportunity_id',            'number');
  reg('noticeId',                 'notice_id',                 'text');
  reg('title',                    'title',                     'text');
  reg('solicitationNumber',       'solicitation_number',       'text');
  reg('departmentAgency',         'department_agency',         'text');
  reg('cgac',                     'cgac',                      'text');
  reg('subTier',                  'sub_tier',                  'text');
  reg('fpdsCode',                 'fpds_code',                 'text');
  reg('office',                   'office',                    'text');
  reg('aacCode',                  'aac_code',                  'text');
  reg('postedDate',               'posted_date',               'date');
  reg('type',                     'type',                      'text');
  reg('baseType',                 'base_type',                 'text');
  reg('archiveType',              'archive_type',              'text');
  reg('archiveDate',              'archive_date',              'date');
  reg('setAsideCode',             'set_aside_code',            'text');
  reg('setAside',                 'set_aside',                 'text');
  reg('responseDeadline',         'response_deadline',         'timestamp');
  reg('naicsCode',                'naics_code',                'text');
  reg('classificationCode',       'classification_code',       'text');
  reg('popStreetAddress',         'pop_street_address',        'text');
  reg('popCity',                  'pop_city',                  'text');
  reg('popState',                 'pop_state',                 'text');
  reg('popZipCode',               'pop_zip_code',              'text');
  reg('popCountry',               'pop_country',               'text');
  reg('active',                   'active',                    'flag');
  reg('awardNumber',              'award_number',              'text');
  reg('awardDate',                'award_date',                'date');
  reg('awardAmount',              'award_amount',              'number');
  reg('awardee',                  'awardee',                   'text');
  reg('primaryContactTitle',      'primary_contact_title',     'text');
  reg('primaryContactFullname',   'primary_contact_fullname',  'text');
  reg('primaryContactEmail',      'primary_contact_email',     'text');
  reg('primaryContactPhone',      'primary_contact_phone',     'text');
  reg('primaryContactFax',        'primary_contact_fax',       'text');
  reg('secondaryContactTitle',    'secondary_contact_title',   'text');
  reg('secondaryContactFullname', 'secondary_contact_fullname','text');
  reg('secondaryContactEmail',    'secondary_contact_email',   'text');
  reg('secondaryContactPhone',    'secondary_contact_phone',   'text');
  reg('secondaryContactFax',      'secondary_contact_fax',     'text');
  reg('organizationType',         'organization_type',         'text');
  reg('state',                    'state',                     'text');
  reg('city',                     'city',                      'text');
  reg('zipCode',                  'zip_code',                  'text');
  reg('countryCode',              'country_code',              'text');
  reg('additionalInfoLink',       'additional_info_link',      'text');
  reg('link',                     'link',                      'text');
  reg('description',              'description',               'clob');
  reg('rejectedByUser',           'rejected_by_user',          'flag');
  reg('parseTimestamp',           'parse_timestamp',           'timestamp');
  reg('lineNumberInExtract',      'line_number_in_extract',    'number');
end heynav_query;
/
show errors
