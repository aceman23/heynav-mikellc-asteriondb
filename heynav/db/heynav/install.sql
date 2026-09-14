rem  Installs the heyNav schema objects and registers the service with DbTwig.
rem  Run as the heyNav schema owner after the DBA has created the user and
rem  granted the DbTwig privileges listed in README.md.
rem
rem  Invocation: sqlplus heynav/<password>@<db> @install

set define off
set serveroutput on

@bid_opportunities.sql
@heynav_query.sql
@heynav_query.pls
@restapi.sql
@restapi.pls

begin
  db_twig.create_dbtwig_service(
    p_service_name                 => 'heyNav',
    p_service_owner                => sys_context('USERENV', 'CURRENT_USER'),
    p_session_validation_procedure => 'restapi.validate_session');
end;
/

@dbTwigData.sql

exit
