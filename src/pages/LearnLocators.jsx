import { useRef, useState } from 'react';
import { track, setCandidate, getSavedName } from '../tracking.js';

/*
  Learn Locators: 2 challenges per level (Easy, Medium, Hard).
  - Each playground has one correct target, marked with data-target.
  - Clicking/typing into the right element shows #result-N (for Playwright asserts).
  - The "Test your locator" box highlights what a CSS or XPath locator matches,
    and says whether it found ONLY the target.
*/

// CSS ids can't start with a digit (#1), so turn #1 into [id="1"]
function toQuerySelector(selector) {
  return selector.trim().replace(/#(\d[\w-]*)/g, '[id="$1"]');
}

function findMatches(root, raw) {
  const isXPath = raw.startsWith('/') || raw.startsWith('(') || raw.startsWith('./');
  if (isXPath) {
    const snap = document.evaluate(raw, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const nodes = [];
    for (let i = 0; i < snap.snapshotLength; i++) {
      const node = snap.snapshotItem(i);
      if (node.nodeType === 1 && root.contains(node)) nodes.push(node);
    }
    return nodes;
  }
  return [...root.querySelectorAll(toQuerySelector(raw))];
}

function LocatorTester({ playgroundRef, n }) {
  const [selector, setSelector] = useState('');
  const [feedback, setFeedback] = useState(null); // { ok, text }

  const clear = () => {
    playgroundRef.current?.querySelectorAll('.loc-hit, .loc-hit-ok')
      .forEach((el) => el.classList.remove('loc-hit', 'loc-hit-ok'));
  };

  const test = () => {
    const root = playgroundRef.current;
    if (!root) return;
    clear();
    const raw = selector.trim();
    if (!raw) return setFeedback({ ok: false, text: 'Type a CSS selector or XPath, then press Test.' });

    let nodes;
    try {
      nodes = findMatches(root, raw);
    } catch {
      track('test_wrong', { challenge: n, locator: raw });
      return setFeedback({ ok: false, text: 'That is not a valid CSS selector or XPath.' });
    }

    const target = root.querySelector('[data-target]');
    const ok = nodes.length === 1 && nodes[0] === target;
    nodes.forEach((el) => el.classList.add(ok ? 'loc-hit-ok' : 'loc-hit'));
    track(ok ? 'test_correct' : 'test_wrong', { challenge: n, locator: raw, matchCount: nodes.length });

    if (ok) setFeedback({ ok: true, text: 'Correct: your locator matches only the target.' });
    else if (nodes.length === 0) setFeedback({ ok: false, text: 'No match. Inspect the HTML and try again.' });
    else if (nodes.length === 1) setFeedback({ ok: false, text: 'Matched 1 element, but it is the wrong one (see highlight).' });
    else setFeedback({
      ok: false,
      text: `Matched ${nodes.length} elements${nodes.includes(target) ? ' (target is one of them)' : ''}. Too wide: Playwright would throw a strict mode error.`,
    });
  };

  return (
    <div className="tester">
      <label htmlFor={`tester-${n}`} className="tester-label">Test your locator (CSS or XPath)</label>
      <div className="selector-try">
        <input
          id={`tester-${n}`}
          type="text"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') test(); }}
          placeholder="e.g. #shipping button  or  //div[@id='shipping']//button"
          spellCheck={false}
        />
        <button type="button" onClick={test}>Test</button>
        <button type="button" className="secondary-btn" onClick={() => { clear(); setFeedback(null); setSelector(''); }}>Clear</button>
      </div>
      {feedback && (
        <p className={feedback.ok ? 'tester-ok' : 'tester-bad'} id={`tester-feedback-${n}`}>{feedback.text}</p>
      )}
    </div>
  );
}

function Challenge({ n, title, level, task, answer, children }) {
  const playgroundRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <article className="challenge" id={`challenge-${n}`}>
      <header className="challenge-head">
        <h2>{n}. {title}</h2>
        <span className={`level level-${level.toLowerCase()}`}>{level}</span>
      </header>
      <p className="task"><strong>Task:</strong> {task}</p>
      <div className="playground" ref={playgroundRef}>{children}</div>
      <LocatorTester playgroundRef={playgroundRef} n={n} />
      <div className="stuck-area">
        {!stuck && (
          <button type="button" className="stuck-btn" onClick={() => { setStuck(true); track('stuck', { challenge: n }); }}>I&apos;m stuck</button>
        )}
        {stuck && !show && (
          <p className="stuck-confirm">
            Inspect the HTML first. Still stuck?
            <button type="button" className="stuck-btn stuck-reveal" onClick={() => { setShow(true); track('reveal', { challenge: n }); }}>Reveal locator</button>
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

function Level({ name, children }) {
  return (
    <div className="level-group">
      <h2 className={`level-title level-${name.toLowerCase()}`}>{name}</h2>
      {children}
    </div>
  );
}

function NameGate({ onStart }) {
  const [name, setName] = useState(getSavedName());
  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim().slice(0, 60);
    if (clean) onStart(clean);
  };
  return (
    <form className="name-gate" onSubmit={submit}>
      <h2>Before you start</h2>
      <p>Enter your name so your mentor can follow your progress.</p>
      <div className="selector-try">
        <input id="candidate-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name" maxLength={60} autoFocus />
        <button type="submit" id="start-practice">Start</button>
      </div>
    </form>
  );
}

export default function LearnLocators() {
  const [candidate, setCandidateState] = useState('');
  const [results, setResults] = useState({});

  const start = (name) => {
    setCandidate(name);
    setCandidateState(name);
    track('start');
  };

  if (!candidate) {
    return (
      <section>
        <h1>Learn Locators</h1>
        <NameGate onStart={start} />
      </section>
    );
  }

  const hit = (n, text) => setResults((r) => ({ ...r, [n]: text }));

  return (
    <section>
      <h1>Learn Locators</h1>
      <p className="hint">Practising as <strong id="candidate">{candidate}</strong>.{' '}
        <button type="button" className="stuck-btn" onClick={() => setCandidateState('')}>Not you?</button>
      </p>
      <p>
        Six challenges, two per level. For each one, write a locator in the test box: it highlights
        what your locator matches and tells you if it found <strong>only</strong> the target. Then use it
        in Playwright and assert the result, e.g.
        <code> await expect(page.locator('#result-1')).toHaveText('Correct: ID')</code>.
      </p>

      <Level name="Easy">
        <Challenge n={1} title="By ID" level="Easy"
          task="Click the button whose id is submit-order."
          answer={`// CSS
#submit-order

// Playwright
await page.locator('#submit-order').click();`}>
          <button id="submit-order" data-target onClick={() => hit(1, 'Correct: ID')}>Submit order</button>
          <button id="cancel-order" onClick={() => hit(1, 'Wrong: that was Cancel order')}>Cancel order</button>
          <Result n={1} text={results[1]} />
        </Challenge>

        <Challenge n={2} title="By class" level="Easy"
          task="Click the button that has BOTH classes btn and primary. Careful: .primary alone matches two elements."
          answer={`// CSS: two classes with no space = same element has both
.btn.primary

// Playwright
await page.locator('.btn.primary').click();`}>
          <button className="btn secondary" onClick={() => hit(2, 'Wrong: that was Back')}>Back</button>
          <button className="btn primary" data-target onClick={() => hit(2, 'Correct: class')}>Continue</button>
          <button className="link primary" onClick={() => hit(2, 'Wrong: that was Help')}>Help</button>
          <Result n={2} text={results[2]} />
        </Challenge>
      </Level>

      <Level name="Medium">
        <Challenge n={3} title="Element inside a container" level="Medium"
          task="There are two Delete buttons. Click the one in the Shipping address section."
          answer={`// CSS (space = "inside")
#shipping button

// XPath
//div[@id='shipping']//button

// Playwright
await page.locator('#shipping').getByRole('button', { name: 'Delete' }).click();`}>
          <div id="billing" className="panel">
            <h3>Billing address</h3>
            <p>12 MG Road, Kochi</p>
            <button onClick={() => hit(3, 'Wrong: that was billing')}>Delete</button>
          </div>
          <div id="shipping" className="panel">
            <h3>Shipping address</h3>
            <p>45 Seaport Road, Kalamassery</p>
            <button data-target onClick={() => hit(3, 'Correct: container')}>Delete</button>
          </div>
          <Result n={3} text={results[3]} />
        </Challenge>

        <Challenge n={4} title="Same button, many cards" level="Medium"
          task="Every plan has a Buy button. Click Buy on the Pro plan only."
          answer={`// CSS (no text matching in plain CSS, so use position)
.plan:nth-child(2) button

// XPath (match by text, more stable)
//div[@class='plan'][h3='Pro']//button

// Playwright
await page.locator('.plan').filter({ hasText: 'Pro' })
  .getByRole('button', { name: 'Buy' }).click();`}>
          <div className="plans">
            {['Basic', 'Pro', 'Enterprise'].map((p) => (
              <div className="plan" key={p}>
                <h3>{p}</h3>
                <button
                  {...(p === 'Pro' ? { 'data-target': '' } : {})}
                  onClick={() => hit(4, p === 'Pro' ? 'Correct: filter' : `Wrong: that was ${p}`)}
                >Buy</button>
              </div>
            ))}
          </div>
          <Result n={4} text={results[4]} />
        </Challenge>
      </Level>

      <Level name="Hard">
        <Challenge n={5} title="Nested HTML" level="Hard"
          task="Click only the Home link. It sits inside div#1 > div#2. About is a trap: a locator that is too wide matches both."
          answer={`// CSS (ids starting with a number need [id="..."] in real CSS;
// the test box also accepts #1)
[id="1"] [id="2"] a

// XPath
//div[@id='2']/a

// Playwright
await page.locator('[id="2"] a').click();`}>
          <div className="nest-tree">
            <div id="1" className="nest-box nest-root">
              <span className="nest-id">div#1</span>
              <div id="2" className="nest-box">
                <span className="nest-id">div#2</span>
                <a href="#/learn-locators" data-target
                  onClick={(e) => { e.preventDefault(); hit(5, 'Correct: nested'); }}>Home</a>
              </div>
              <div id="3" className="nest-box">
                <span className="nest-id">div#3</span>
                <a href="#/learn-locators"
                  onClick={(e) => { e.preventDefault(); hit(5, 'Wrong: that was About'); }}>About</a>
              </div>
            </div>
          </div>
          <Result n={5} text={results[5]} />
        </Challenge>

        <Challenge n={6} title="Deeply nested" level="Hard"
          task="Click the Confirm link, 7 levels deep. There is also a Confirm link outside #app-shell. Don't write the full path of every div."
          answer={`// CSS: anchor on something unique, then search at any depth
#app-shell .actions a

//   '#app-shell > a'  -> no match: the link is not a direct child
//   '#app-shell a'    -> 2 matches: there is a Help link too

// XPath
//div[@id='app-shell']//a[text()='Confirm']

// Playwright
await page.locator('#app-shell').getByRole('link', { name: 'Confirm' }).click();`}>
          <a href="#/learn-locators" onClick={(e) => { e.preventDefault(); hit(6, 'Wrong: that Confirm is outside #app-shell'); }}>
            Confirm
          </a>
          <div id="app-shell">
            <div className="layout">
              <div className="main">
                <div className="card">
                  <div className="card-body">
                    <p>Please confirm your order. <a href="#/learn-locators" onClick={(e) => e.preventDefault()}>Help</a></p>
                    <div className="actions">
                      <span>
                        <a href="#/learn-locators" data-target
                          onClick={(e) => { e.preventDefault(); hit(6, 'Correct: deeply nested'); }}>Confirm</a>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Result n={6} text={results[6]} />
        </Challenge>
      </Level>
    </section>
  );
}
