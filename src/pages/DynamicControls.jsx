import { useState } from 'react';

const DELAY = 3000;

export default function DynamicControls() {
  const [checkboxVisible, setCheckboxVisible] = useState(true);
  const [checked, setChecked] = useState(false);
  const [checkboxBusy, setCheckboxBusy] = useState(false);
  const [checkboxMsg, setCheckboxMsg] = useState('');

  const [inputEnabled, setInputEnabled] = useState(false);
  const [inputBusy, setInputBusy] = useState(false);
  const [inputMsg, setInputMsg] = useState('');

  const toggleCheckbox = () => {
    setCheckboxBusy(true);
    setCheckboxMsg('');
    setTimeout(() => {
      setCheckboxVisible((v) => {
        setCheckboxMsg(v ? "It's gone!" : "It's back!");
        return !v;
      });
      setCheckboxBusy(false);
    }, DELAY);
  };

  const toggleInput = () => {
    setInputBusy(true);
    setInputMsg('');
    setTimeout(() => {
      setInputEnabled((e) => {
        setInputMsg(e ? "It's disabled!" : "It's enabled!");
        return !e;
      });
      setInputBusy(false);
    }, DELAY);
  };

  return (
    <section>
      <h1>Dynamic Controls</h1>

      <h2>Remove / Add</h2>
      <div id="checkbox-example" className="box">
        {checkboxVisible && (
          <label id="checkbox">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              data-testid="checkbox"
            />{' '}
            A checkbox
          </label>
        )}
        <button onClick={toggleCheckbox} disabled={checkboxBusy} data-testid="toggle-checkbox">
          {checkboxVisible ? 'Remove' : 'Add'}
        </button>
        {checkboxBusy && <span className="loading" data-testid="checkbox-loading">Wait for it...</span>}
        {checkboxMsg && <p id="checkbox-message" data-testid="checkbox-message">{checkboxMsg}</p>}
      </div>

      <h2>Enable / Disable</h2>
      <div id="input-example" className="box">
        <input type="text" disabled={!inputEnabled} placeholder="Type here" data-testid="text-input" />
        <button onClick={toggleInput} disabled={inputBusy} data-testid="toggle-input">
          {inputEnabled ? 'Disable' : 'Enable'}
        </button>
        {inputBusy && <span className="loading" data-testid="input-loading">Wait for it...</span>}
        {inputMsg && <p id="input-message" data-testid="input-message">{inputMsg}</p>}
      </div>
    </section>
  );
}
