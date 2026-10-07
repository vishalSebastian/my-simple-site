import { useState } from 'react';

/* Level 3: Finding tricky elements (moved from Learn Locators, plus new ones). */

const stop = (fn) => (e) => { e.preventDefault(); fn(); };

export function NestedHtml({ onSolved, onFail }) {
  return (
    <div className="nest-tree">
      <div id="1" className="nest-box nest-root">
        <span className="nest-id">div#1</span>
        <div id="2" className="nest-box">
          <span className="nest-id">div#2</span>
          <a href="#home" onClick={stop(onSolved)}>Home</a>
        </div>
        <div id="3" className="nest-box">
          <span className="nest-id">div#3</span>
          <a href="#about" onClick={stop(() => onFail('That was About.'))}>About</a>
        </div>
      </div>
    </div>
  );
}

export function DeeplyNested({ onSolved, onFail }) {
  return (
    <div className="stack">
      <a href="#confirm" onClick={stop(() => onFail('That Confirm is outside #app-shell.'))}>Confirm</a>
      <div id="app-shell">
        <div className="layout">
          <div className="main">
            <div className="card">
              <div className="card-body">
                <p>Please confirm your order. <a href="#help" onClick={stop(() => onFail('That was Help.'))}>Help</a></p>
                <div className="actions">
                  <span>
                    <a href="#confirm" onClick={stop(onSolved)}>Confirm</a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManyCards({ onSolved, onFail }) {
  return (
    <div className="plans">
      {['Basic', 'Pro', 'Enterprise'].map((p) => (
        <div className="plan" key={p}>
          <h3>{p}</h3>
          <p className="hint">{p === 'Basic' ? 'Free' : p === 'Pro' ? '₹499/mo' : 'Contact us'}</p>
          <button
            type="button"
            onClick={() => (p === 'Pro' ? onSolved() : onFail(`That was ${p}.`))}
          >Buy</button>
        </div>
      ))}
    </div>
  );
}

const ROLES = ['Developer', 'Tester', 'Lead', 'Manager'];

export function TableEdit({ onSolved, onFail }) {
  const [rows, setRows] = useState([
    { name: 'Rahul', role: 'Developer' },
    { name: 'Anu', role: 'Tester' },
    { name: 'Joseph', role: 'Manager' },
  ]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  const save = (name) => {
    setRows(rows.map((r) => (r.name === name ? { ...r, role: draft } : r)));
    setEditing(null);
    if (name !== 'Anu') onFail(`You changed ${name}, not Anu. Reload and try again.`, { lock: true });
    else if (draft === 'Lead') onSolved();
    else onFail(`Anu's role was saved as ${draft}, not Lead.`);
  };

  return (
    <table id="users">
      <thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>
              {editing === r.name ? (
                <select aria-label="Role" value={draft} onChange={(e) => setDraft(e.target.value)}>
                  {ROLES.map((x) => <option key={x}>{x}</option>)}
                </select>
              ) : r.role}
            </td>
            <td>
              {editing === r.name
                ? <button type="button" onClick={() => save(r.name)}>Save</button>
                : (
                  <button
                    type="button"
                    onClick={() => { setEditing(r.name); setDraft(r.role); }}
                    disabled={editing !== null}
                  >Edit</button>
                )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const rand = () => Math.floor(Math.random() * 100000);

export function DynamicHidden({ onSolved, onFail }) {
  const [ids] = useState(() => ({ hidden: `btn-${rand()}`, visible: `btn-${rand()}` }));
  return (
    <div className="stack">
      {/* Hidden "mobile menu" with a duplicate button */}
      <div className="mobile-menu" style={{ display: 'none' }}>
        <button type="button" id={ids.hidden} onClick={() => onFail('That was the hidden mobile button.')}>Download report</button>
      </div>
      <button type="button" id={ids.visible} onClick={onSolved}>Download report</button>
      <p className="hint">This button&apos;s id right now: <code>{ids.visible}</code> (changes on every reload)</p>
    </div>
  );
}
