// Sends learning events to Supabase (insert-only; the site can't read data back).
// Supabase project: omuylnudrojhsashhvfj
const SUPABASE_URL = 'https://omuylnudrojhsashhvfj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bvrU5hLcKhj6g0l88nHSfw_LF0JIFCT';

const NAME_KEY = 'qa-practice-candidate';
const sessionId =
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

let candidate = '';

export function getSavedName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function setCandidate(name) {
  candidate = name;
  try { localStorage.setItem(NAME_KEY, name); } catch { /* storage blocked: keep in memory */ }
}

export function track(event, { challenge = null, locator = null, matchCount = null } = {}) {
  if (!candidate || !SUPABASE_URL) return;
  fetch(`${SUPABASE_URL}/rest/v1/locator_events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      session_id: sessionId,
      candidate,
      challenge,
      event,
      locator,
      match_count: matchCount,
    }),
  }).catch(() => { /* tracking must never break the page */ });
}
