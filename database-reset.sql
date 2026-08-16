-- WARNING: Destructive development reset.
-- Run only in the intended Supabase project. This drops every object in the
-- public schema, including all application data, tables, policies, functions,
-- triggers, and custom types. Supabase Auth users in auth.users are preserved.
--
-- After this finishes:
-- 1. Run database.sql.
-- 2. Run database-update-001-purchases.sql.
-- 3. Run `npm run seed:test` locally.

begin;

drop schema if exists public cascade;
create schema public authorization postgres;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
grant all on tables to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
grant all on sequences to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
grant execute on functions to postgres, anon, authenticated, service_role;

commit;
