-- Admin-managed approval is independent of the login provider.
create schema if not exists casebook_private;
revoke all on schema casebook_private from public, anon, authenticated;
create table casebook_private.archive_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 approved_at timestamptz not null default now()
);
alter table casebook_private.archive_members enable row level security;
revoke all on casebook_private.archive_members from public, anon, authenticated;
-- Membership starts empty. A trusted administrator explicitly approves selected IDs.
create function public.has_archive_access() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from casebook_private.archive_members where user_id=(select auth.uid()));
$$;
revoke all on function public.has_archive_access() from public,anon;
grant execute on function public.has_archive_access() to authenticated;
create policy cases_approved_members on public.cases as restrictive for all to authenticated
 using ((select public.has_archive_access())) with check ((select public.has_archive_access()));
create policy profiles_approved_members on public.profiles as restrictive for all to authenticated
 using ((select public.has_archive_access())) with check ((select public.has_archive_access()));
