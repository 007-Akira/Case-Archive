-- Apply with Supabase CLI or the SQL editor. Never apply from the browser.
create extension if not exists pg_trgm;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.case_counters (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_number bigint not null default 0
);
create table public.cases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 case_number bigint not null,
 patient_alias text not null default '',
 sex text not null default '',
 occupation text not null default '',
 department text not null default '',
 ward text not null default '',
 bed_number text not null default '',
 chief_complaints text not null default '',
 complaint_duration text not null default '',
 history_of_presenting_illness text not null default '',
 positive_history text not null default '',
 negative_history text not null default '',
 other_history_label text not null default '',
 other_history text not null default '',
 past_medical_surgical_history text not null default '',
 personal_history text not null default '',
 family_history text not null default '',
 general_examination text not null default '',
 systemic_examination text not null default '',
 investigations text not null default '',
 important_findings text not null default '',
 provisional_diagnosis text not null default '',
 final_diagnosis text not null default '',
 treatment_management text not null default '',
 outcome text not null default '',
 follow_up text not null default '',
 additional_notes text not null default '',
 last_step smallint not null default 0 check(last_step between 0 and 6),
 age smallint check(age between 0 and 130),
 encounter_date date,
 differential_diagnoses jsonb not null default '[]'::jsonb check(jsonb_typeof(differential_diagnoses)='array' and jsonb_array_length(differential_diagnoses)<=50),
 status text not null default 'draft' check(status in ('draft','completed')),
 is_favorite boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
 unique(user_id,case_number),
 constraint completed_minimum check(status='draft' or (length(trim(patient_alias))>0 and length(trim(department))>0 and length(trim(chief_complaints))>0 and length(trim(final_diagnosis))>0)),
 constraint valid_sex check(sex in ('','Female','Male','Other','Not recorded'))
);
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
create trigger profile_updated before update on public.profiles for each row execute function public.touch_updated_at();
create function public.prepare_case() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Invalid case owner' using errcode='42501'; end if;
 if TG_OP='INSERT' then
   -- Retries use the same UUID. Do not change an existing case's number during UPSERT.
   select case_number into new.case_number from public.cases where id=new.id and user_id=auth.uid();
   if new.case_number is null then
     insert into public.case_counters(user_id,last_number) values(auth.uid(),1)
     on conflict(user_id) do update set last_number=public.case_counters.last_number+1
     returning last_number into new.case_number;
   end if;
   new.created_at=now();
 else
   if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Case identity is immutable';end if;
   new.case_number=old.case_number;new.created_at=old.created_at;
 end if;
 new.updated_at=now();
 if new.status='completed' then
   if TG_OP='UPDATE' then new.completed_at=coalesce(old.completed_at,now());else new.completed_at=now();end if;
 else new.completed_at=null;end if;
 return new;
end $$;
create trigger prepare_case before insert or update on public.cases for each row execute function public.prepare_case();
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100)) on conflict(id) do nothing;return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_counters enable row level security;
-- Counters are trigger-only. No client policies or grants.
revoke all on public.case_counters from anon,authenticated;
revoke all on public.cases, public.profiles from anon;
grant select,insert,update,delete on public.cases,public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);
create policy cases_select_own on public.cases for select to authenticated using ((select auth.uid()) = user_id);
create policy cases_insert_own on public.cases for insert to authenticated with check ((select auth.uid()) = user_id);
create policy cases_update_own on public.cases for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cases_delete_own on public.cases for delete to authenticated using ((select auth.uid()) = user_id);
create index cases_owner_updated on public.cases(user_id,updated_at desc);
create index cases_owner_created on public.cases(user_id,created_at desc);
create index cases_owner_encounter on public.cases(user_id,encounter_date);
create index cases_owner_filters on public.cases(user_id,status,department,ward,sex);
create index cases_owner_favorites on public.cases(user_id,is_favorite) where is_favorite;
create index cases_search_patient_alias on public.cases using gin (patient_alias gin_trgm_ops);
create index cases_search_chief_complaints on public.cases using gin (chief_complaints gin_trgm_ops);
create index cases_search_provisional_diagnosis on public.cases using gin (provisional_diagnosis gin_trgm_ops);
create index cases_search_final_diagnosis on public.cases using gin (final_diagnosis gin_trgm_ops);
revoke execute on function public.prepare_case(), public.handle_new_user() from public,anon,authenticated;
