-- =====================================================================
-- Employee Onboarding app - database setup (no Supabase Auth, no Storage)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run. Uses Supabase only as a database.
--
-- How it works:
--   * Our own users table (passwords hashed with bcrypt).
--   * login() creates a JWT (HS256) signed with our own random secret.
--   * The website calls functions via /rest/v1/rpc/<name> and passes the token.
--   * Tables live in the private "app" schema, so they can't be read directly
--     through the API - only through these functions, which check the token.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Clean up the earlier Supabase Auth/Storage version (if it was run) ----------
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

-- ---------- Private schema and tables ----------
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

create table if not exists app.settings (
  key   text primary key,
  value text not null
);
-- Random secret used to sign tokens (created once, never leaves the database)
insert into app.settings (key, value)
values ('jwt_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

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

-- ---------- JWT helpers (private) ----------
create or replace function app.b64url_encode(data bytea) returns text
language sql immutable as $$
  select translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;

create or replace function app.b64url_decode(data text) returns bytea
language sql immutable as $$
  select decode(
    rpad(translate(data, '-_', '+/'), ((length(data) + 3) / 4) * 4, '='),
    'base64');
$$;

create or replace function app.sign(data text) returns text
language sql stable as $$
  select app.b64url_encode(extensions.hmac(
    convert_to(data, 'utf8'),
    convert_to((select value from app.settings where key = 'jwt_secret'), 'utf8'),
    'sha256'));
$$;

create or replace function app.make_token(u app.users) returns text
language plpgsql stable as $$
declare
  header  text := app.b64url_encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'));
  iat     bigint := extract(epoch from now())::bigint;
  payload text;
begin
  payload := app.b64url_encode(convert_to(json_build_object(
    'sub', u.id, 'email', u.email, 'name', u.full_name, 'role', u.role,
    'iat', iat, 'exp', iat + 3600)::text, 'utf8'));
  return header || '.' || payload || '.' || app.sign(header || '.' || payload);
end $$;

-- Checks the token and returns the logged-in user (errors map to HTTP 401)
create or replace function app.verify(p_token text) returns app.users
language plpgsql stable as $$
declare
  parts   text[] := string_to_array(coalesce(p_token, ''), '.');
  payload json;
  u       app.users;
begin
  if array_length(parts, 1) is distinct from 3 then
    raise exception 'Not authenticated' using errcode = 'PT401';
  end if;
  if app.sign(parts[1] || '.' || parts[2]) <> parts[3] then
    raise exception 'Invalid token' using errcode = 'PT401';
  end if;
  payload := convert_from(app.b64url_decode(parts[2]), 'utf8')::json;
  if (payload->>'exp')::bigint < extract(epoch from now()) then
    raise exception 'JWT expired' using errcode = 'PT401';
  end if;
  select * into u from app.users where id = (payload->>'sub')::uuid;
  if not found then
    raise exception 'Not authenticated' using errcode = 'PT401';
  end if;
  return u;
end $$;

create or replace function app.user_json(u app.users) returns json
language sql immutable as $$
  select json_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name, 'role', u.role, 'created_at', u.created_at);
$$;

-- Own data, or HR (errors map to HTTP 403)
create or replace function app.check_access(me app.users, target uuid) returns void
language plpgsql stable as $$
begin
  if me.id <> target and me.role <> 'hr' then
    raise exception 'Permission denied' using errcode = 'PT403';
  end if;
end $$;

-- ---------- Public API (called from the website) ----------

-- Sign up: just adds a user. No email.
create or replace function public.signup(p_full_name text, p_email text, p_password text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  u app.users;
begin
  p_full_name := trim(coalesce(p_full_name, ''));
  p_email := lower(trim(coalesce(p_email, '')));
  if length(p_full_name) < 2 then raise exception 'Full name must be at least 2 characters'; end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Enter a valid email'; end if;
  if p_password is null or length(p_password) < 8 or p_password !~ '[A-Z]' or p_password !~ '[a-z]'
     or p_password !~ '[0-9]' or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'Password must have 8+ characters, an uppercase letter, a lowercase letter, a number and a special character';
  end if;
  begin
    insert into app.users (full_name, email, password_hash)
    values (p_full_name, p_email, extensions.crypt(p_password, extensions.gen_salt('bf')))
    returning * into u;
  exception when unique_violation then
    raise exception 'An account with this email already exists' using errcode = 'PT409';
  end;
  return app.user_json(u);
end $$;

-- Log in: checks the password and returns a JWT (valid for 1 hour)
create or replace function public.login(p_email text, p_password text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  u app.users;
begin
  select * into u from app.users where email = lower(trim(coalesce(p_email, '')));
  if not found or u.password_hash <> extensions.crypt(coalesce(p_password, ''), u.password_hash) then
    raise exception 'Invalid login credentials' using errcode = 'PT401';
  end if;
  return json_build_object(
    'access_token', app.make_token(u),
    'token_type', 'bearer',
    'expires_in', 3600,
    'expires_at', extract(epoch from now())::bigint + 3600,
    'user', app.user_json(u));
end $$;

-- Who am I? (checks the token)
create or replace function public.me(p_token text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
begin
  return app.user_json(app.verify(p_token));
end $$;

create or replace function public.get_onboarding(p_token text, p_user_id uuid default null)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  target uuid := coalesce(p_user_id, me.id);
begin
  perform app.check_access(me, target);
  return (select row_to_json(o) from app.onboarding o where o.user_id = target);
end $$;

-- Save the form (status becomes draft). Not allowed after submitting.
create or replace function public.save_onboarding(p_token text, p_fields jsonb)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  current_status text;
  f jsonb := coalesce(p_fields, '{}'::jsonb);
begin
  select status into current_status from app.onboarding where user_id = me.id;
  if current_status in ('submitted', 'approved') then
    raise exception 'Onboarding is already submitted' using errcode = 'PT409';
  end if;
  insert into app.onboarding as o (
    user_id, status, first_name, last_name, phone, date_of_birth, address,
    emergency_contact_name, emergency_contact_phone, department, job_title,
    start_date, employment_type, work_location, updated_at)
  values (
    me.id, 'draft', f->>'first_name', f->>'last_name', f->>'phone', nullif(f->>'date_of_birth', '')::date, f->>'address',
    f->>'emergency_contact_name', f->>'emergency_contact_phone', f->>'department', f->>'job_title',
    nullif(f->>'start_date', '')::date, f->>'employment_type', f->>'work_location', now())
  on conflict (user_id) do update set
    status = 'draft', first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone,
    date_of_birth = excluded.date_of_birth, address = excluded.address,
    emergency_contact_name = excluded.emergency_contact_name, emergency_contact_phone = excluded.emergency_contact_phone,
    department = excluded.department, job_title = excluded.job_title, start_date = excluded.start_date,
    employment_type = excluded.employment_type, work_location = excluded.work_location, updated_at = now();
  return (select row_to_json(o) from app.onboarding o where o.user_id = me.id);
end $$;

create or replace function public.submit_onboarding(p_token text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  o app.onboarding;
begin
  select * into o from app.onboarding where user_id = me.id;
  if not found or o.status not in ('draft', 'rejected') then
    raise exception 'Nothing to submit' using errcode = 'PT409';
  end if;
  if coalesce(o.first_name, '') = '' or coalesce(o.last_name, '') = '' or coalesce(o.department, '') = '' then
    raise exception 'Please complete the form before submitting';
  end if;
  update app.onboarding set status = 'submitted', submitted_at = now(), updated_at = now()
  where user_id = me.id;
  return (select row_to_json(x) from app.onboarding x where x.user_id = me.id);
end $$;

-- ---------- Documents ----------
create or replace function public.list_documents(p_token text, p_user_id uuid default null)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  target uuid := coalesce(p_user_id, me.id);
begin
  perform app.check_access(me, target);
  return coalesce((
    select json_agg(json_build_object(
      'id', d.id, 'user_id', d.user_id, 'doc_type', d.doc_type, 'file_name', d.file_name,
      'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at) order by d.created_at)
    from app.documents d where d.user_id = target), '[]'::json);
end $$;

-- Upload (base64). One file per type: uploading again replaces it.
create or replace function public.upload_document(p_token text, p_doc_type text, p_file_name text, p_mime_type text, p_content_base64 text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  bytes bytea;
  d app.documents;
begin
  if (select status from app.onboarding where user_id = me.id) in ('submitted', 'approved') then
    raise exception 'Onboarding is already submitted' using errcode = 'PT409';
  end if;
  if p_doc_type not in ('photo', 'id_proof', 'resume') then raise exception 'Unknown document type'; end if;
  if p_mime_type not in ('image/png', 'image/jpeg', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document') then
    raise exception 'This file type is not allowed';
  end if;
  bytes := decode(p_content_base64, 'base64');
  if octet_length(bytes) > 5 * 1024 * 1024 then raise exception 'File is too large (max 5 MB)'; end if;
  delete from app.documents where user_id = me.id and doc_type = p_doc_type;
  insert into app.documents (user_id, doc_type, file_name, mime_type, size_bytes, content)
  values (me.id, p_doc_type, left(coalesce(p_file_name, 'file'), 200), p_mime_type, octet_length(bytes), bytes)
  returning * into d;
  return json_build_object('id', d.id, 'user_id', d.user_id, 'doc_type', d.doc_type, 'file_name', d.file_name,
    'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at);
end $$;

create or replace function public.delete_document(p_token text, p_document_id uuid)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
begin
  if (select status from app.onboarding where user_id = me.id) in ('submitted', 'approved') then
    raise exception 'Onboarding is already submitted' using errcode = 'PT409';
  end if;
  delete from app.documents where id = p_document_id and user_id = me.id;
  return json_build_object('deleted', found);
end $$;

create or replace function public.get_document(p_token text, p_document_id uuid)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
  d app.documents;
begin
  select * into d from app.documents where id = p_document_id;
  if not found then raise exception 'Document not found' using errcode = 'PT404'; end if;
  perform app.check_access(me, d.user_id);
  return json_build_object('file_name', d.file_name, 'mime_type', d.mime_type,
    'content_base64', replace(encode(d.content, 'base64'), E'\n', ''));
end $$;

-- ---------- HR ----------
create or replace function public.list_employees(p_token text)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
begin
  if me.role <> 'hr' then raise exception 'Permission denied' using errcode = 'PT403'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', u.id, 'email', u.email, 'full_name', u.full_name, 'role', u.role, 'created_at', u.created_at,
      'onboarding', case when o.user_id is null then null else json_build_object(
        'status', o.status, 'submitted_at', o.submitted_at, 'department', o.department, 'job_title', o.job_title) end
    ) order by u.created_at desc)
    from app.users u left join app.onboarding o on o.user_id = u.id
    where u.role = 'employee'), '[]'::json);
end $$;

create or replace function public.review_onboarding(p_token text, p_user_id uuid, p_decision text, p_comment text default null)
returns json language plpgsql security definer set search_path = app, public, extensions as $$
declare
  me app.users := app.verify(p_token);
begin
  if me.role <> 'hr' then raise exception 'Permission denied' using errcode = 'PT403'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if p_decision = 'rejected' and coalesce(trim(p_comment), '') = '' then
    raise exception 'A comment is required when rejecting';
  end if;
  update app.onboarding
  set status = p_decision, hr_comment = nullif(trim(coalesce(p_comment, '')), ''),
      reviewed_at = now(), reviewed_by = me.id, updated_at = now()
  where user_id = p_user_id and status = 'submitted';
  if not found then raise exception 'This onboarding is not waiting for review' using errcode = 'PT409'; end if;
  return (select row_to_json(o) from app.onboarding o where o.user_id = p_user_id);
end $$;

-- ---------- Permissions: the website can only call these functions ----------
revoke all on all tables in schema app from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;

do $$
declare fn text;
begin
  foreach fn in array array[
    'signup(text, text, text)', 'login(text, text)', 'me(text)',
    'get_onboarding(text, uuid)', 'save_onboarding(text, jsonb)', 'submit_onboarding(text)',
    'list_documents(text, uuid)', 'upload_document(text, text, text, text, text)',
    'delete_document(text, uuid)', 'get_document(text, uuid)',
    'list_employees(text)', 'review_onboarding(text, uuid, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to anon, authenticated', fn);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ============ After running ============
-- Make someone HR (they must sign up on the site first):
--   update app.users set role = 'hr' where email = 'your@email.com';
-- See users:
--   select id, full_name, email, role, created_at from app.users;
