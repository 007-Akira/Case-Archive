-- Run as an administrator in the SQL editor after both migrations.
-- Entire test rolls back, including its temporary Auth user/profile/membership/cases.
begin;
select set_config('casebook.test_user', gen_random_uuid()::text, true);
insert into auth.users(id,aud,role,email)
values(current_setting('casebook.test_user')::uuid,'authenticated','authenticated',
 'approval-test-' || current_setting('casebook.test_user') || '@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('casebook.test_user'),true);
do $$
begin
 if public.has_archive_access() then raise exception 'Unapproved account has access';end if;
 if exists(select 1 from public.cases) or exists(select 1 from public.profiles) then
   raise exception 'Unapproved account can read archive data';end if;
 begin
   insert into public.cases(user_id) values(auth.uid());
   raise exception 'Unapproved account can create cases';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
insert into casebook_private.archive_members(user_id)
values(current_setting('casebook.test_user')::uuid);
set local role authenticated;
do $$
begin
 if not public.has_archive_access() then raise exception 'Approved account lacks access';end if;
 insert into public.cases(user_id) values(auth.uid());
end $$;
rollback;
