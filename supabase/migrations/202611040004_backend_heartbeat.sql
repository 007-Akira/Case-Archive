-- Deliberately public, data-free database availability probe for external monitoring.
-- No SECURITY DEFINER, no tables, no user/session access, no writes.
create function public.backend_heartbeat() returns boolean
language sql stable security invoker set search_path='' as $$ select true; $$;
revoke all on function public.backend_heartbeat() from public;
grant execute on function public.backend_heartbeat() to anon,authenticated;
notify pgrst, 'reload schema';
