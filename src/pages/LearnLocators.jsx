import { useRef, useState } from 'react';

/*
  Learn Locators: each challenge has a target to click/type into.
  When the right element is used, a result message appears (#result-N),
  so tests can assert they hit the correct element.
  Targets intentionally do NOT all have data-testid: finding them is the exercise.
*/

function Challenge({ n, title, level, task, answer, children }) {
  const [stuck, setStuck] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <article className="challenge" id={`challenge-${n}`}>
      <header className="challenge-head">
        <h2>{typeof n === 'number' ? `${n}. ${title}` : title}</h2>
        <span className={`level level-${level.toLowerCase()}`}>{level}</span>
      </header>
      <p className="task"><strong>Task:</strong> {task}</p>
      <div className="playground">{children}</div>
      <div className="stuck-area">
        {!stuck && (
          <button type="button" className="stuck-btn" onClick={() => setStuck(true)}>
            I&apos;m stuck
          </button>
        )}
        {stuck && !show && (
          <p className="stuck-confirm">
            Inspect the HTML first. Still stuck?
            <button type="button" className="stuck-btn stuck-reveal" onClick={() => setShow(true)}>
              Reveal locator
            </button>
          </p>
        )}
        {show && (
          <>
            <button type="button" className="stuck-btn" onClick={() => setShow(false)}>Hide locator</button>
            <pre className="answer"><code>{answer}</code></pre>
          </>
        )}
      </div>
    </article>
  );
}

function Result({ n, text }) {
  return text ? <p className="result" id={`result-${n}`}>{text}</p> : null;
}

function toQuerySelector(selector) {
  return selector.trim().replace(/#(\d+)/g, '[id="$1"]');
}

function NestedPathLab({ result, onCorrect }) {
  const treeRef = useRef(null);
  const [selector, setSelector] = useState('');
  const [feedback, setFeedback] = useState('');

  const trySelector = () => {
    const root = treeRef.current;
    if (!root) return;
    root.querySelectorAll('.nest-hit').forEach((el) => el.classList.remove('nest-hit'));
    const raw = selector.trim();
    if (!raw) {
      setFeedback('Type a CSS path, then Try.');
      return;
    }
    let nodes;
    try {
      nodes = [...root.querySelectorAll(toQuerySelector(raw))];
    } catch {
      setFeedback('That is not valid CSS.');
      return;
    }
    nodes.forEach((el) => el.classList.add('nest-hit'));
    const target = root.querySelector('[data-nest-target]');
    if (nodes.length === 1 && nodes[0] === target) {
      onCorrect();
      setFeedback('Correct: that path finds only Home.');
    } else if (nodes.length === 0) {
      setFeedback('No match.');
    } else {
      setFeedback(`Matched ${nodes.length} elements — too many.`);
    }
  };

  return (
    <div className="nest-lab">
      <div className="nest-tree" id="nest-tree" ref={treeRef}>
        <div id="1" className="nest-box nest-root">
          <span className="nest-id">div#1</span>
          <div id="2" className="nest-box">
            <span className="nest-id">div#2</span>
            <a
              href="#/learn-locators"
              data-nest-target
              onClick={(e) => {
                e.preventDefault();
                onCorrect();
              }}
            >
              Home
            </a>
          </div>
          <div id="3" className="nest-box">
            <span className="nest-id">div#3</span>
            <a
              href="#/learn-locators"
              onClick={(e) => e.preventDefault()}
            >
              About
            </a>
          </div>
        </div>
      </div>
      <div className="selector-try">
        <input
          id="nest-selector"
          type="text"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') trySelector(); }}
          placeholder="your CSS path"
          aria-label="CSS selector"
        />
        <button type="button" id="try-selector" onClick={trySelector}>Try</button>
      </div>
      {feedback && <p className="hint" id="nest-feedback">{feedback}</p>}
      <Result n="nested" text={result} />
    </div>
  );
}

export default function LearnLocators() {
  const [results, setResults] = useState({});
  const hit = (n, text) => setResults((r) => ({ ...r, [n]: text }));
  const [dynId] = useState(() => `btn-${Math.floor(Math.random() * 100000)}`);
  const [typed, setTyped] = useState('');

  return (
    <section>
      <h1>Learn Locators</h1>
      <p>
        Find the target in each playground (click or type). When you are right, a result
        appears so a test can assert it, for example
        <code>await expect(page.locator('#result-1')).toHaveText('Correct: ID')</code>.
        Inspect the HTML. Locators stay hidden unless you are stuck.
      </p>

      <Challenge n="nested" title="Nested HTML" level="Medium"
        task="Click only the Home link. It is nested inside other divs. About is a trap — a locator that is too wide will match both."
        answer={`await page.locator('#1 #2 a').click();`}>
        <NestedPathLab
          result={results.nested}
          onCorrect={() => hit('nested', 'Correct: nested path')}
        />
      </Challenge>

      {/* 1. ID */}
      <Challenge n={1} title="By ID" level="Easy"
        task="Click the button whose id is submit-order."
        answer={`await page.locator('#submit-order').click();`}>
        <button id="submit-order" onClick={() => hit(1, 'Correct: ID')}>Submit order</button>
        <button id="cancel-order">Cancel order</button>
        <Result n={1} text={results[1]} />
      </Challenge>

      {/* 2. Class */}
      <Challenge n={2} title="By class" level="Easy"
        task="Click the button that has both classes btn and primary."
        answer={`await page.locator('.btn.primary').click();`}>
        <button className="btn secondary">Back</button>
        <button className="btn primary" onClick={() => hit(2, 'Correct: class')}>Continue</button>
        <button className="link primary">Help</button>
        <Result n={2} text={results[2]} />
      </Challenge>

      {/* 3. Role and text */}
      <Challenge n={3} title="By role and visible text" level="Easy"
        task="Click Save. Do not click Save as draft. Do not use a CSS selector."
        answer={`await page.getByRole('button', { name: 'Save', exact: true }).click();`}>
        <button onClick={() => hit(3, 'Wrong: that was Save as draft')}>Save as draft</button>
        <button onClick={() => hit(3, 'Correct: role')}>Save</button>
        <Result n={3} text={results[3]} />
      </Challenge>

      {/* 4. Attributes */}
      <Challenge n={4} title="By attributes" level="Easy"
        task="Type kochi@test.com into the Email field. It has no id."
        answer={`await page.getByPlaceholder('you@example.com').fill('kochi@test.com');`}>
        <label>Name <input name="fullname" placeholder="Your name" /></label>
        <label>Email <input name="email" placeholder="you@example.com"
          onChange={(e) => hit(4, e.target.value === 'kochi@test.com' ? 'Correct: attribute' : '')} /></label>
        <Result n={4} text={results[4]} />
      </Challenge>

      {/* 5. Nested */}
      <Challenge n={5} title="Nested: element inside a container" level="Medium"
        task="There are two Delete buttons. Click the one in the Shipping address section."
        answer={`await page.locator('#shipping').getByRole('button', { name: 'Delete' }).click();`}>
        <div id="billing" className="panel">
          <h3>Billing address</h3>
          <p>12 MG Road, Kochi</p>
          <button onClick={() => hit(5, 'Wrong: that was billing')}>Delete</button>
        </div>
        <div id="shipping" className="panel">
          <h3>Shipping address</h3>
          <p>45 Seaport Road, Kalamassery</p>
          <button onClick={() => hit(5, 'Correct: nested')}>Delete</button>
        </div>
        <Result n={5} text={results[5]} />
      </Challenge>

      {/* 6. Deeply nested */}
      <Challenge n={6} title="Deeply nested" level="Medium"
        task="Click the Confirm link. It is nested several levels down."
        answer={`await page.locator('#app-shell').getByRole('link', { name: 'Confirm' }).click();`}>
        <div id="app-shell">
          <div className="layout">
            <div className="main">
              <div className="card">
                <div className="card-body">
                  <p>Please confirm your order.</p>
                  <div className="actions">
                    <span>
                      <a href="#/learn-locators" onClick={(e) => { e.preventDefault(); hit(6, 'Correct: deeply nested'); }}>
                        Confirm
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Result n={6} text={results[6]} />
      </Challenge>

      {/* 7. Duplicates: filter */}
      <Challenge n={7} title="Same button, many cards (filter)" level="Medium"
        task="Every plan has a Buy button. Click Buy on the Pro plan."
        answer={`await page
  .locator('.plan')
  .filter({ hasText: 'Pro' })
  .getByRole('button', { name: 'Buy' })
  .click();`}>
        <div className="plans">
          {['Basic', 'Pro', 'Enterprise'].map((p) => (
            <div className="plan" key={p}>
              <h3>{p}</h3>
              <button onClick={() => hit(7, p === 'Pro' ? 'Correct: filter' : `Wrong: that was ${p}`)}>Buy</button>
            </div>
          ))}
        </div>
        <Result n={7} text={results[7]} />
      </Challenge>

      {/* 8. Lists: nth */}
      <Challenge n={8} title="Lists: pick by position" level="Medium"
        task="Click the 3rd fruit in the list."
        answer={`await page.locator('#fruits li').nth(2).click();`}>
        <ul id="fruits">
          {['Apple', 'Banana', 'Mango', 'Orange'].map((f, i) => (
            <li key={f} onClick={() => hit(8, i === 2 ? 'Correct: nth' : `Wrong: that was ${f}`)}>{f}</li>
          ))}
        </ul>
        <Result n={8} text={results[8]} />
      </Challenge>

      {/* 9. Tables */}
      <Challenge n={9} title="Tables: find row, then act" level="Hard"
        task="Click Edit in the row for Anu."
        answer={`await page.getByRole('row').filter({ hasText: 'Anu' }).getByRole('button', { name: 'Edit' }).click();`}>
        <table id="users">
          <thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead>
          <tbody>
            {[['Rahul', 'Developer'], ['Anu', 'Tester'], ['Joseph', 'Manager']].map(([name, role]) => (
              <tr key={name}>
                <td>{name}</td><td>{role}</td>
                <td><button onClick={() => hit(9, name === 'Anu' ? 'Correct: table row' : `Wrong: that was ${name}`)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Result n={9} text={results[9]} />
      </Challenge>

      {/* 10. Dynamic IDs */}
      <Challenge n={10} title="Dynamic IDs" level="Hard"
        task="This button's id changes on every refresh. Click it in a way that still works next time."
        answer={`await page.getByRole('button', { name: 'Download report' }).click();`}>
        <button id={dynId} onClick={() => hit(10, 'Correct: dynamic id')}>Download report</button>
        <p className="hint">Current id: <code>{dynId}</code></p>
        <Result n={10} text={results[10]} />
      </Challenge>

      {/* 11. Label without for */}
      <Challenge n={11} title="Siblings: label not linked to input" level="Hard"
        task="Type Kerala into the State field. The label is not linked to the input."
        answer={`await page.locator('.field').filter({ hasText: 'State' }).locator('input').fill('Kerala');`}>
        <div className="field"><span>City</span> <input type="text" /></div>
        <div className="field"><span>State</span>{' '}
          <input type="text" onChange={(e) => hit(11, e.target.value === 'Kerala' ? 'Correct: sibling' : '')} /></div>
        <div className="field"><span>Country</span> <input type="text" /></div>
        <Result n={11} text={results[11]} />
      </Challenge>

      {/* 12. Hidden duplicates */}
      <Challenge n={12} title="Hidden duplicate elements" level="Hard"
        task="Two Checkout buttons exist in the HTML. One is hidden. Click the one a user can see."
        answer={`await page.getByRole('button', { name: 'Checkout' }).click();`}>
        <div className="mobile-menu" style={{ display: 'none' }}>
          <button onClick={() => hit(12, 'Wrong: hidden button')}>Checkout</button>
        </div>
        <button onClick={() => hit(12, 'Correct: visible')}>Checkout</button>
        <Result n={12} text={results[12]} />
      </Challenge>

      {/* 13. iframe */}
      <Challenge n={13} title="Inside an iframe" level="Hard"
        task="Click Pay now. It lives inside an iframe."
        answer={`const frame = page.frameLocator('#payment-frame');
await frame.getByRole('button', { name: 'Pay now' }).click();`}>
        <iframe
          id="payment-frame"
          title="payment"
          className="frame"
          srcDoc={`<body style="font-family:sans-serif">
            <p>Card payment widget</p>
            <button onclick="document.getElementById('paid').textContent='Payment done'">Pay now</button>
            <p id="paid"></p></body>`}
        />
      </Challenge>

      {/* 14. Typed input + assertion practice */}
      <Challenge n={14} title="Mixed: type, then check the echo" level="Medium"
        task="Type a name in the box inside #profile. The greeting should read Hi, that name!"
        answer={`await page.locator('#profile').getByRole('textbox').fill('Vishal');
await expect(page.locator('#profile .greeting')).toHaveText('Hi, Vishal!');`}>
        <div id="profile" className="panel">
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Name" />
          {typed && <p className="greeting">Hi, {typed}!</p>}
        </div>
      </Challenge>
    </section>
  );
}
