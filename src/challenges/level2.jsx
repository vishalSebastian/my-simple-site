import { useEffect, useRef, useState } from 'react';

/* Level 2: Waiting. Things appear, enable or change later. */

export function DelayedReport({ onSolved }) {
  const [status, setStatus] = useState('idle'); // idle | working | ready
  const start = () => {
    setStatus('working');
    setTimeout(() => setStatus('ready'), 7000); // longer than Playwright's default 5s expect timeout
  };
  return (
    <div className="stack">
      <button type="button" onClick={start} disabled={status !== 'idle'}>Generate report</button>
      {status === 'working' && <p className="loading">Generating report, this can take a while...</p>}
      {status === 'ready' && (
        <div className="panel report">
          <h3>Monthly report is ready</h3>
          <p>Report ID: R-2026-10</p>
          <button type="button" onClick={onSolved}>Download</button>
        </div>
      )}
    </div>
  );
}

export function EnabledLater({ onSolved }) {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <div className="stack">
      <p>Security check in progress. The button unlocks when it finishes.</p>
      <button type="button" disabled={left > 0} onClick={onSolved}>Verify</button>
      <p className="hint" aria-live="polite">{left > 0 ? `Available in ${left}s` : 'Ready'}</p>
    </div>
  );
}

const USERS = ['Rahul', 'Anu', 'Joseph', 'Meera'];

export function SpinnerOverlay({ onSolved }) {
  const [state, setState] = useState('idle'); // idle | loading | loaded
  const [profile, setProfile] = useState('');
  const load = () => {
    setState('loading');
    setTimeout(() => setState('loaded'), 3000);
  };
  const open = (u) => {
    setProfile(u);
    if (u === 'Anu') onSolved();
  };
  return (
    <div className="stack">
      <button type="button" onClick={load} disabled={state !== 'idle'}>Load users</button>
      {state !== 'idle' && (
        <div className="overlay-wrap">
          {/* The list is in the page right away, but covered by a spinner overlay */}
          <ul className="user-list">
            {USERS.map((u) => (
              <li key={u}>
                <button type="button" className="link-btn" onClick={() => open(u)}>{u}</button>
              </li>
            ))}
          </ul>
          {state === 'loading' && (
            <div className="overlay" data-testid="spinner"><span className="spinner" /> Loading users...</div>
          )}
        </div>
      )}
      {profile && <p className="panel">Profile: <strong>{profile}</strong></p>}
    </div>
  );
}

const STEPS = ['Queued', 'Processing', 'Processing 50%', 'Processing 90%', 'Completed'];

export function FinalStatus({ onSolved, onFail }) {
  const [step, setStep] = useState(-1);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    setStep(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= STEPS.length - 1) clearInterval(timer.current);
    }, 1500);
  };

  const confirm = () => {
    if (STEPS[step] === 'Completed') onSolved();
    else onFail(`Too early: the job was still "${STEPS[step] || 'not started'}". Reload and try again.`, { lock: true });
  };

  return (
    <div className="stack">
      <div className="row-buttons">
        <button type="button" onClick={start} disabled={step >= 0}>Start job</button>
        <button type="button" onClick={confirm} disabled={step < 0}>Confirm</button>
      </div>
      {step >= 0 && <p>Status: <strong id="job-status">{STEPS[step]}</strong></p>}
    </div>
  );
}
