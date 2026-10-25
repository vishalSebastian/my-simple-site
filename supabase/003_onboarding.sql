-- Employee Onboarding app. Run once in Supabase: SQL Editor -> New query -> paste -> Run
-- (choose "with RLS" if asked). Safe to re-run.

-- ============ 1. Profiles (one per login, created automatically on sign-up) ============
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'employee' check (role in ('employee', 'hr')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Is the logged-in user HR? (security definer avoids RLS recursion)
create or replace function public.is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'hr');
$$;

-- ============ 2. Onboarding form (one row per employee) ============
create table if not exists public.onboarding (
  user_id                 uuid primary key references public.profiles(id) on delete cascade,
  status                  text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  first_name              text,
  last_name               text,
  phone                   text,
  date_of_birth           date,
  address                 text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  department              text,
  job_title               text,
  start_date              date,
  employment_type         text,
  work_location           text,
  hr_comment              text,
  submitted_at            timestamptz,
  reviewed_at             timestamptz,
  reviewed_by             uuid references public.profiles(id),
  updated_at              timestamptz not null default now()
);

-- ============ 3. Uploaded documents (files live in Storage, metadata here) ============
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  doc_type      text not null check (doc_type in ('photo', 'id_proof', 'resume')),
  file_name     text not null,
  storage_path  text not null unique,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

-- ============ 4. Row Level Security ============
alter table public.profiles   enable row level security;
alter table public.onboarding enable row level security;
alter table public.documents  enable row level security;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.onboarding to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant execute on function public.is_hr() to authenticated;

-- Profiles: see your own; HR sees everyone. Nobody can change roles from the app.
drop policy if exists "profiles: read own or hr" on public.profiles;
create policy "profiles: read own or hr" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_hr());

-- Onboarding: employee reads/writes own row while it's draft or rejected,
-- and may only set status to draft or submitted. HR reads all and decides.
drop policy if exists "onboarding: read own or hr" on public.onboarding;
create policy "onboarding: read own or hr" on public.onboarding
  for select to authenticated using (user_id = auth.uid() or public.is_hr());

drop policy if exists "onboarding: employee insert" on public.onboarding;
create policy "onboarding: employee insert" on public.onboarding
  for insert to authenticated with check (user_id = auth.uid() and status = 'draft');

drop policy if exists "onboarding: employee update" on public.onboarding;
create policy "onboarding: employee update" on public.onboarding
  for update to authenticated
  using (user_id = auth.uid() and status in ('draft', 'rejected'))
  with check (user_id = auth.uid() and status in ('draft', 'submitted'));

drop policy if exists "onboarding: hr review" on public.onboarding;
create policy "onboarding: hr review" on public.onboarding
  for update to authenticated
  using (public.is_hr() and status = 'submitted')
  with check (public.is_hr() and status in ('approved', 'rejected'));

-- Documents: employee manages own; HR can read all.
drop policy if exists "documents: read own or hr" on public.documents;
create policy "documents: read own or hr" on public.documents
  for select to authenticated using (user_id = auth.uid() or public.is_hr());

drop policy if exists "documents: insert own" on public.documents;
create policy "documents: insert own" on public.documents
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "documents: delete own" on public.documents;
create policy "documents: delete own" on public.documents
  for delete to authenticated using (user_id = auth.uid());

-- ============ 5. Storage bucket for uploads (private, 5 MB, images/PDF/Word) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('onboarding-docs', 'onboarding-docs', false, 5242880, array[
  'image/png', 'image/jpeg', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored as <user_id>/<file>. Employees use their own folder; HR can read all.
drop policy if exists "docs: upload own folder" on storage.objects;
create policy "docs: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'onboarding-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "docs: read own folder or hr" on storage.objects;
create policy "docs: read own folder or hr" on storage.objects
  for select to authenticated
  using (bucket_id = 'onboarding-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hr()));

drop policy if exists "docs: delete own folder" on storage.objects;
create policy "docs: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'onboarding-docs' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

-- ============ After running ============
-- Make someone HR (they must sign up first):
--   update public.profiles set role = 'hr' where email = 'hr@yourcompany.com';
