import { Link } from 'react-router-dom';
import { CHALLENGES, LEVELS } from '../challenges/registry.js';

export default function Challenges() {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}#/challenges`;
  const starter = `import { test, expect } from '@playwright/test';

const BASE = '${base}';
const NAME = 'Shinu';

test('01: click the right button', async ({ page }) => {
  await page.goto(\`\${BASE}/01?name=\${NAME}\`);

  // your steps here

  await expect(page.getByTestId('success-code')).toContainText('PW-01-');
});`;

  return (
    <section>
      <h1>Playwright Challenges</h1>
      <p>
        Each challenge is a small page with one task. Do the task with a <strong>Playwright test</strong>.
        If it&apos;s done right, a green box with a code (like <code>PW-01-1A2B</code>) appears, and your
        test should check for it. Doing it by hand gives no code.
      </p>

      <h2>Starter test</h2>
      <pre className="answer"><code>{starter}</code></pre>
      <p className="hint">
        Rules: no <code>waitForTimeout</code>, and try before you press &quot;I&apos;m stuck&quot;. Your attempts, hints and
        reveals are recorded.
      </p>

      {LEVELS.map((level) => (
        <div className="level-group" key={level.n}>
          <h2><span className={`level level-l${level.n}`}>Level {level.n}</span> {level.name}</h2>
          <p className="hint">{level.blurb}</p>
          <ul className="cards">
            {CHALLENGES.filter((c) => c.level === level.n).map((c) => (
              <li key={c.id} className="card">
                <Link to={`/challenges/${c.id}`}><h3>{c.id}. {c.title}</h3></Link>
                <p>{c.task}</p>
                <p className="hint">Skill: <code>{c.skill}</code></p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
