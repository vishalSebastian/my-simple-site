import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CHALLENGES, LEVELS, getChallenge } from '../challenges/registry.js';
import { track, setCandidate, getSavedName, isAutomated } from '../tracking.js';

const DEFAULT_CANDIDATE = 'Shinu';

// Short, stable code per candidate + challenge, e.g. PW-03-7F2A
function successCode(id, name) {
  let h = 5381;
  for (const ch of `${id}:${name.toLowerCase()}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `PW-${id}-${h.toString(16).toUpperCase().slice(-4).padStart(4, '0')}`;
}

export function challengeUrl(id, name) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}#/challenges/${id}`;
  return `${base}?name=${encodeURIComponent(name || 'YourName')}`;
}

export default function ChallengePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const challenge = getChallenge(id);
  // Default candidate is Shinu; ?name= in the URL can still override it
  const name = (params.get('name') || getSavedName() || DEFAULT_CANDIDATE).trim().slice(0, 60);

  const [result, setResult] = useState(null); // { type: 'solved' | 'manual' | 'fail', ... }
  const [runKey, setRunKey] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [reveal, setReveal] = useState(false);

  // Reset everything when moving to another challenge
  useEffect(() => {
    setResult(null); setStuck(false); setReveal(false); setRunKey((k) => k + 1);
    if (!challenge) return;
    if (name) setCandidate(name);
    track('open', { challenge: Number(id) });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!challenge) {
    return (
      <section>
        <h1>Challenge not found</h1>
        <Link to="/challenges">Back to all challenges</Link>
      </section>
    );
  }

  const n = Number(id);
  const level = LEVELS.find((l) => l.n === challenge.level);
  const idx = CHALLENGES.indexOf(challenge);
  const prev = CHALLENGES[idx - 1];
  const next = CHALLENGES[idx + 1];
  const locked = result?.type === 'solved' || result?.type === 'manual' || (result?.type === 'fail' && result.lock);

  const onSolved = () => {
    if (locked) return;
    if (isAutomated()) {
      setResult({ type: 'solved', code: successCode(id, name || 'anonymous') });
      track('solved', { challenge: n });
    } else {
      setResult({ type: 'manual' });
      track('solved_manual', { challenge: n });
    }
  };

  const onFail = (message, { lock = false } = {}) => {
    if (locked) return;
    setResult({ type: 'fail', message, lock });
    track('fail', { challenge: n, locator: message.slice(0, 300) });
  };

  const C = challenge.Component;

  return (
    <section className="challenge-page" data-challenge={id}>
      <p className="crumbs"><Link to="/challenges">Challenges</Link> / Level {level.n}: {level.name}</p>

      <header className="challenge-head">
        <h1>{id}. {challenge.title}</h1>
        <span className={`level level-l${level.n}`}>Level {level.n}</span>
      </header>

      <p className="hint">Candidate: <strong data-testid="candidate">{name}</strong></p>

      <div className="instructions">
        <p className="task"><strong>Task:</strong> {challenge.task}</p>
        <p>
          Do the task with a Playwright test. If it&apos;s done right, a green box with a code
          (like <code>PW-{id}-1A2B</code>) appears. Your test should check for that code.
        </p>
        <pre className="answer"><code>{`await page.goto('${challengeUrl(id, name)}');
// ...your steps...
await expect(page.getByTestId('success-code')).toContainText('PW-${id}-');`}</code></pre>
      </div>

      <div className="playground" key={runKey} aria-disabled={locked || undefined}>
        <C onSolved={onSolved} onFail={onFail} />
      </div>

      {result?.type === 'solved' && (
        <div className="outcome outcome-ok" role="status">
          <strong>Well done!</strong> Your code:
          <code className="success-code" data-testid="success-code">{result.code}</code>
        </div>
      )}
      {result?.type === 'manual' && (
        <div className="outcome outcome-warn" role="status" data-testid="manual-message">
          <strong>No code: this was done by hand.</strong> Run it with your Playwright test instead.
        </div>
      )}
      {result?.type === 'fail' && (
        <div className="outcome outcome-bad" role="alert" data-testid="fail-message">
          <strong>Not right:</strong> {result.message}
        </div>
      )}
      {result && result.type !== 'solved' && (
        <button type="button" className="secondary-btn" onClick={() => { setResult(null); setRunKey((k) => k + 1); }}>
          Reset challenge
        </button>
      )}

      <div className="stuck-area">
        {!stuck && (
          <button type="button" className="stuck-btn" onClick={() => { setStuck(true); track('stuck', { challenge: n }); }}>
            I&apos;m stuck
          </button>
        )}
        {stuck && (
          <div className="hint-box">
            <p><strong>Hint:</strong> {challenge.hint}</p>
            {!reveal && (
              <button type="button" className="stuck-btn stuck-reveal" onClick={() => { setReveal(true); track('reveal', { challenge: n }); }}>
                Still stuck? Reveal answer
              </button>
            )}
          </div>
        )}
        {reveal && <pre className="answer"><code>{challenge.answer}</code></pre>}
      </div>

      <nav className="pager">
        {prev ? <Link to={`/challenges/${prev.id}${name ? `?name=${encodeURIComponent(name)}` : ''}`}>← {prev.id}. {prev.title}</Link> : <span />}
        {next ? <Link to={`/challenges/${next.id}${name ? `?name=${encodeURIComponent(name)}` : ''}`}>{next.id}. {next.title} →</Link> : <span />}
      </nav>
    </section>
  );
}
