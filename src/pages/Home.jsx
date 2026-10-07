import { Link } from 'react-router-dom';

const pages = [
  { to: '/challenges', title: 'Playwright Challenges', desc: '13 challenges in 3 levels: basics, waiting, and tricky locators. Solve them with Playwright scripts.' },
  { to: '/delay', title: 'Delayed Message', desc: 'Click Start; the message appears after a delay. Practise waiting with expect().' },
  { to: '/dynamic-controls', title: 'Dynamic Controls', desc: 'Remove/add a checkbox and enable/disable an input.' },
  { to: '/progress-bar', title: 'Progress Bar', desc: 'Start and stop a progress bar at the right value.' },
  { to: '/login', title: 'Login', desc: 'A fake login form with validation messages.' },
];

export default function Home() {
  return (
    <section>
      <h1>Welcome to Vishal's QA Automation Practice</h1>
      <p>Small pages built to practise Playwright and Selenium. Nothing here is real; use dummy data only.
      </p>
      <p>
        This is a practice project to learn Playwright.
      </p>
      <ul className="cards">
        {pages.map((p) => (
          <li key={p.to} className="card">
            <Link to={p.to}><h2>{p.title}</h2></Link>
            <p>{p.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
