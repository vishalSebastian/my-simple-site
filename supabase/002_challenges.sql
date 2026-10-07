-- Run once in Supabase SQL Editor (choose "with RLS" if asked).
-- Adds what the Playwright Challenges need. Safe to re-run.

-- 1. Was the browser driven by Playwright? (navigator.webdriver)
alter table public.locator_events add column if not exists automated boolean;

-- 2. Allow the new event types
alter table public.locator_events drop constraint if exists locator_events_event_check;
alter table public.locator_events add constraint locator_events_event_check
  check (event in (
    'start', 'open', 'test_correct', 'test_wrong', 'stuck', 'reveal',
    'solved', 'solved_manual', 'fail'
  ));

-- 3. Summary per candidate per challenge.
--    Only rows from the new Challenges page (automated is set) are counted.
create or replace view public.challenge_summary
with (security_invoker = on) as
with ev as (
  select * from public.locator_events
  where automated is not null and challenge is not null
),
per as (
  select
    candidate,
    challenge,
    count(*) filter (where event = 'open' and automated)  as playwright_runs,
    count(*) filter (where event = 'fail')                as fails,
    count(*) filter (where event = 'solved_manual')       as hand_clicks,
    min(created_at) filter (where event = 'stuck')        as first_stuck_at,
    min(created_at) filter (where event = 'reveal')       as first_reveal_at,
    min(created_at) filter (where event = 'solved')       as first_solved_at
  from ev
  group by candidate, challenge
)
select
  p.candidate,
  lpad(p.challenge::text, 2, '0') as challenge,
  p.first_solved_at is not null as solved_with_playwright,
  p.first_solved_at is not null
    and (p.first_reveal_at is null or p.first_solved_at < p.first_reveal_at) as solved_without_answer,
  p.playwright_runs,
  p.fails,
  p.hand_clicks,
  p.first_stuck_at is not null as used_hint,
  p.first_reveal_at is not null as revealed_answer,
  -- revealed the answer before ever running a Playwright script on this challenge
  p.first_reveal_at is not null and not exists (
    select 1 from ev e
    where e.candidate = p.candidate and e.challenge = p.challenge
      and e.event = 'open' and e.automated and e.created_at < p.first_reveal_at
  ) as asked_help_without_trying,
  p.first_solved_at as solved_at
from per p
order by p.candidate, p.challenge;

revoke all on public.challenge_summary from anon, authenticated;

notify pgrst, 'reload schema';

-- Handy queries:
-- select * from challenge_summary;
-- select * from challenge_summary where asked_help_without_trying;
-- select * from challenge_summary where hand_clicks > 0 and not solved_with_playwright;
