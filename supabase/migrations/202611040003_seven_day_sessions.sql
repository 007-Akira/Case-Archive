-- Keep Supabase's short-lived access tokens. Enforce an absolute archive lifetime
-- against the authoritative session row; refreshes do not extend this boundary.
create function public.archive_session_expires_at() returns timestamptz
language sql stable security definer set search_path='' as $$
 select s.created_at + interval '7 days' from auth.sessions s
 where s.id = nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=(select auth.uid());
$$;
revoke all on function public.archive_session_expires_at() from public,anon;
grant execute on function public.archive_session_expires_at() to authenticated;
create or replace function public.has_archive_access() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from casebook_private.archive_members where user_id=(select auth.uid()))
 and coalesce(public.archive_session_expires_at()>now(),false);
$$;
create function public.archive_session_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('approved',public.has_archive_access(),'expires_at',public.archive_session_expires_at());
$$;
revoke all on function public.archive_session_status() from public,anon;
grant execute on function public.archive_session_status() to authenticated;
