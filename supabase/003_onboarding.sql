-- =====================================================================
-- Employee Onboarding app - database tables (Supabase used only as a database)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- All logic (sign up, login/JWT, onboarding, HR) lives in the Node.js API: server/app.js
-- The API connects with DATABASE_URL; the tables are in the private "app" schema,
-- so they can't be reached through Supabase's public API.
-- =====================================================================

-- ---------- Clean up earlier versions of this file (if they were run) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_hr() cascade;
drop function if exists public.hr_can_see(uuid) cascade;
drop table if exists public.documents cascade;
drop table if exists public.onboarding cascade;
drop table if exists public.profiles cascade;
drop policy if exists "docs: upload own folder" on storage.objects;
drop policy if exists "docs: read own folder or hr" on storage.objects;
drop policy if exists "docs: delete own folder" on storage.objects;
drop function if exists public.signup(text, text, text);
drop function if exists public.login(text, text);
drop function if exists public.me(text);
drop function if exists public.get_onboarding(text, uuid);
drop function if exists public.save_onboarding(text, jsonb);
drop function if exists public.submit_onboarding(text);
drop function if exists public.list_documents(text, uuid);
drop function if exists public.upload_document(text, text, text, text, text);
drop function if exists public.delete_document(text, uuid);
drop function if exists public.get_document(text, uuid);
drop function if exists public.list_employees(text);
drop function if exists public.review_onboarding(text, uuid, text, text);

-- ---------- Tables ----------
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

create table if not exists app.users (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  email          text not null unique,
  password_hash  text not null,
  role           text not null default 'employee' check (role in ('employee', 'hr')),
  created_at     timestamptz not null default now()
);

create table if not exists app.onboarding (
  user_id                 uuid primary key references app.users(id) on delete cascade,
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
  reviewed_by             uuid references app.users(id),
  updated_at              timestamptz not null default now()
);

create table if not exists app.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  doc_type    text not null check (doc_type in ('photo', 'id_proof', 'resume')),
  file_name   text not null,
  mime_type   text not null,
  size_bytes  int not null,
  content     bytea not null,
  created_at  timestamptz not null default now(),
  unique (user_id, doc_type)
);

-- Leftovers from the SQL-functions version
drop function if exists app.verify(text), app.make_token(app.users), app.sign(text),
  app.b64url_encode(bytea), app.b64url_decode(text), app.user_json(app.users),
  app.check_access(app.users, uuid);
drop table if exists app.settings;

revoke all on all tables in schema app from public, anon, authenticated;

-- ============ After running ============
-- Make someone HR (sign up on the site first):
--   update app.users set role = 'hr' where email = 'your@email.com';
