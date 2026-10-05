-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. Events table
create table if not exists public.locator_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  text not null,
  candidate   text not null check (char_length(candidate) between 1 and 60),
  challenge   int,
  event       text not null check (event in ('start', 'test_correct', 'test_wrong', 'stuck', 'reveal')),
  locator     text check (char_length(locator) <= 300),
  match_count int
);

-- 2. Security: the website may only INSERT. Nobody can read/edit/delete via the public key.
alter table public.locator_events enable row level security;

drop policy if exists "site can insert events" on public.locator_events;
create policy "site can insert events"
  on public.locator_events for insert
  to anon
  with check (true);

revoke all on public.locator_events from anon, authenticated;
grant insert on public.locator_events to anon;

-- 3. Summary per candidate, per challenge (view it in the Table Editor or SQL Editor)
create or replace view public.locator_summary
with (security_invoker = on) as
with per_challenge as (
  select
    candidate,
    challenge,
    min(created_at) filter (where event = 'reveal')       as first_reveal_at,
    min(created_at) filter (where event = 'test_correct') as first_correct_at,
    count(*) filter (where event in ('test_correct', 'test_wrong')) as total_attempts
  from public.locator_events
  where challenge is not null
  group by candidate, challenge
)
select
  p.candidate,
  p.challenge,
  p.total_attempts,
  (
    select count(*)
    from public.locator_events e
    where e.candidate = p.candidate
      and e.challenge = p.challenge
      and e.event in ('test_correct', 'test_wrong')
      and (p.first_reveal_at is null or e.created_at < p.first_reveal_at)
  ) as attempts_before_reveal,
  p.first_correct_at is not null
    and (p.first_reveal_at is null or p.first_correct_at < p.first_reveal_at) as solved_on_own,
  p.first_reveal_at is not null as revealed_answer,
  p.first_reveal_at is not null and not exists (
    select 1
    from public.locator_events e
    where e.candidate = p.candidate
      and e.challenge = p.challenge
      and e.event in ('test_correct', 'test_wrong')
      and e.created_at < p.first_reveal_at
  ) as asked_help_without_trying
from per_challenge p
order by p.candidate, p.challenge;

revoke all on public.locator_summary from anon, authenticated;

-- Handy queries:
-- select * from locator_summary;
-- select * from locator_summary where asked_help_without_trying;
-- select * from locator_events order by created_at desc limit 100;
