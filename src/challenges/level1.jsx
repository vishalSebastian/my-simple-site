import { useEffect, useState } from 'react';

/* Level 1: Basics. Each component calls onSolved() when the task is done right,
   or onFail(message) when the candidate does something wrong. */

export function ClickRightButton({ onSolved, onFail }) {
  return (
    <div className="row-buttons">
      <button type="button" className="secondary-btn" onClick={() => onFail('That was Cancel.')}>Cancel</button>
      <button type="button" className="secondary-btn" onClick={() => onFail('That was Save as draft.')}>Save as draft</button>
      <button type="button" onClick={onSolved}>Save</button>
    </div>
  );
}

export function FillForm({ onSolved, onFail }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return onFail('All fields are required.');
    if (form.name.trim() === 'Asha Menon' && form.email.trim() === 'asha@test.com' && form.phone.trim() === '9876543210') {
      onSolved();
    } else {
      onFail('The details do not match the task. Check each value.');
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label htmlFor="reg-name">Full name</label>
      <input id="reg-name" value={form.name} onChange={set('name')} />
      <label htmlFor="reg-email">Email</label>
      <input id="reg-email" type="email" value={form.email} onChange={set('email')} />
      <label htmlFor="reg-phone">Phone</label>
      <input id="reg-phone" type="tel" value={form.phone} onChange={set('phone')} />
      <button type="submit">Register</button>
    </form>
  );
}

export function CheckboxesRadios({ onSolved, onFail }) {
  const [plan, setPlan] = useState('basic');
  const [prefs, setPrefs] = useState({ email: false, sms: false, calls: true });
  const [agree, setAgree] = useState(false);
  const toggle = (k) => () => setPrefs({ ...prefs, [k]: !prefs[k] });

  const submit = () => {
    const ok = plan === 'pro' && prefs.email && prefs.sms && !prefs.calls && agree;
    if (ok) onSolved();
    else onFail('Not quite. Check the plan, every contact option, and the terms box.');
  };

  return (
    <div className="form">
      <fieldset>
        <legend>Plan</legend>
        {['basic', 'pro', 'enterprise'].map((p) => (
          <label key={p} className="inline">
            <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} />
            {p[0].toUpperCase() + p.slice(1)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Contact me by</legend>
        <label className="inline"><input type="checkbox" checked={prefs.email} onChange={toggle('email')} />Email updates</label>
        <label className="inline"><input type="checkbox" checked={prefs.sms} onChange={toggle('sms')} />SMS updates</label>
        <label className="inline"><input type="checkbox" checked={prefs.calls} onChange={toggle('calls')} />Phone calls</label>
      </fieldset>
      <label className="inline"><input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />I agree to the terms</label>
      <button type="button" onClick={submit}>Continue</button>
    </div>
  );
}

const PLACES = {
  India: { Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode'], Karnataka: ['Bengaluru', 'Mysuru'], 'Tamil Nadu': ['Chennai', 'Coimbatore'] },
  UAE: { Dubai: ['Dubai'], 'Abu Dhabi': ['Abu Dhabi', 'Al Ain'] },
  USA: { California: ['San Francisco', 'Los Angeles'], Texas: ['Austin', 'Dallas'] },
};

export function CascadingDropdowns({ onSolved, onFail }) {
  const [country, setCountry] = useState('');
  const [states, setStates] = useState(null); // null = not loaded
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // States "load from the server" 1.5s after picking a country
  useEffect(() => {
    setStates(null); setState(''); setCity('');
    if (!country) return undefined;
    const t = setTimeout(() => setStates(Object.keys(PLACES[country])), 1500);
    return () => clearTimeout(t);
  }, [country]);

  const submit = () => {
    if (country === 'India' && state === 'Kerala' && city === 'Kochi') onSolved();
    else onFail('Wrong location selected.');
  };

  return (
    <div className="form">
      <label htmlFor="country">Country</label>
      <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
        <option value="">Choose a country</option>
        {Object.keys(PLACES).map((c) => <option key={c}>{c}</option>)}
      </select>

      <label htmlFor="state">State</label>
      <select id="state" value={state} disabled={!states} onChange={(e) => { setState(e.target.value); setCity(''); }}>
        <option value="">{country && !states ? 'Loading states...' : 'Choose a state'}</option>
        {(states || []).map((s) => <option key={s}>{s}</option>)}
      </select>

      <label htmlFor="city">City</label>
      <select id="city" value={city} disabled={!state} onChange={(e) => setCity(e.target.value)}>
        <option value="">Choose a city</option>
        {(state ? PLACES[country][state] : []).map((c) => <option key={c}>{c}</option>)}
      </select>

      <button type="button" onClick={submit}>Submit</button>
    </div>
  );
}
