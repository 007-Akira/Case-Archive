-- The function must ALSO be enabled as the Supabase Password Verification Hook.
-- Creating it alone does not turn on rate limiting. Never expose this hook to browsers.
create table casebook_private.login_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 failures integer not null default 0 check(failures>=0),
 window_started_at timestamptz not null default now(),
 blocked_until timestamptz
);
alter table casebook_private.login_attempts enable row level security;
revoke all on casebook_private.login_attempts from public,anon,authenticated;
create function public.casebook_password_verification_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (event->>'user_id')::uuid;
 valid_password boolean := (event->>'valid')::boolean;
 attempt casebook_private.login_attempts%rowtype;
begin
 if not exists(select 1 from casebook_private.archive_members where user_id=actor) then
   return jsonb_build_object('decision','reject','message','Sign-in is not available for this account.','should_logout_user',false);
 end if;
 insert into casebook_private.login_attempts(user_id) values(actor) on conflict do nothing;
 select * into attempt from casebook_private.login_attempts where user_id=actor for update;
 if attempt.blocked_until > now() then
   return jsonb_build_object('decision','reject','message','Too many attempts. Try again later.','should_logout_user',false);
 end if;
 if valid_password then
   delete from casebook_private.login_attempts where user_id=actor;
   return jsonb_build_object('decision','continue');
 end if;
 if attempt.window_started_at < now()-interval '15 minutes' then
   attempt.failures=0;attempt.window_started_at=now();
 end if;
 attempt.failures=attempt.failures+1;
 update casebook_private.login_attempts
 set failures=attempt.failures,window_started_at=attempt.window_started_at,
 blocked_until=case when attempt.failures>=5 then now()+interval '15 minutes' else null end
 where user_id=actor;
 if attempt.failures>=5 then
   return jsonb_build_object('decision','reject','message','Too many attempts. Try again later.','should_logout_user',false);
 end if;
 return jsonb_build_object('decision','continue');
end $$;
revoke all on function public.casebook_password_verification_hook(jsonb) from public,anon,authenticated;
grant execute on function public.casebook_password_verification_hook(jsonb) to supabase_auth_admin;
