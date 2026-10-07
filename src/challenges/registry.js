import { ClickRightButton, FillForm, CheckboxesRadios, CascadingDropdowns } from './level1.jsx';
import { DelayedReport, EnabledLater, SpinnerOverlay, FinalStatus } from './level2.jsx';
import { NestedHtml, DeeplyNested, ManyCards, TableEdit, DynamicHidden } from './level3.jsx';

export const LEVELS = [
  { n: 1, name: 'Basics', blurb: 'Open a page, find elements, click, type, check and select.' },
  { n: 2, name: 'Waiting', blurb: 'Things appear, unlock or change later. No waitForTimeout allowed.' },
  { n: 3, name: 'Finding tricky elements', blurb: 'Nested HTML, duplicates, tables, dynamic ids and hidden copies.' },
];

/*
  Every challenge: id (2 digits, used in the URL), level, title, skill, task,
  hint (shown after "I'm stuck"), answer (shown after "Reveal answer"), Component.
*/
export const CHALLENGES = [
  // ---------- Level 1: Basics ----------
  {
    id: '01', level: 1, title: 'Click the right button', skill: 'goto · getByRole · click',
    task: 'Click Save. Not Save as draft, not Cancel.',
    hint: 'getByRole matches the accessible name. "Save" is part of "Save as draft" too. How do you make it match exactly?',
    answer: `await page.getByRole('button', { name: 'Save', exact: true }).click();`,
    Component: ClickRightButton,
  },
  {
    id: '02', level: 1, title: 'Fill and submit a form', skill: 'getByLabel · fill · submit',
    task: 'Register with name Asha Menon, email asha@test.com and phone 9876543210.',
    hint: 'Each input has a <label>. Playwright can find an input by its label text.',
    answer: `await page.getByLabel('Full name').fill('Asha Menon');
await page.getByLabel('Email').fill('asha@test.com');
await page.getByLabel('Phone').fill('9876543210');
await page.getByRole('button', { name: 'Register' }).click();`,
    Component: FillForm,
  },
  {
    id: '03', level: 1, title: 'Checkboxes and radio buttons', skill: 'check · uncheck · toBeChecked',
    task: 'Choose the Pro plan, get Email and SMS updates but NO phone calls, agree to the terms, then Continue.',
    hint: 'Look at the default state carefully: one option is already ticked. check() and uncheck() are safer than click().',
    answer: `await page.getByLabel('Pro').check();
await page.getByLabel('Email updates').check();
await page.getByLabel('SMS updates').check();
await page.getByLabel('Phone calls').uncheck();
await page.getByLabel('I agree to the terms').check();
await page.getByRole('button', { name: 'Continue' }).click();`,
    Component: CheckboxesRadios,
  },
  {
    id: '04', level: 1, title: 'Cascading dropdowns', skill: 'selectOption',
    task: 'Pick India, then Kerala, then Kochi, and Submit. States take a moment to load after you pick a country.',
    hint: 'These are native <select> elements. selectOption waits for the option to exist and the select to be enabled.',
    answer: `await page.getByLabel('Country').selectOption('India');
await page.getByLabel('State').selectOption('Kerala');
await page.getByLabel('City').selectOption('Kochi');
await page.getByRole('button', { name: 'Submit' }).click();`,
    Component: CascadingDropdowns,
  },

  // ---------- Level 2: Waiting ----------
  {
    id: '05', level: 2, title: 'Result appears after a delay', skill: 'expect().toBeVisible({ timeout })',
    task: 'Generate the report and click Download when it appears. It takes about 7 seconds.',
    hint: "The default expect timeout is 5 seconds. Click actions wait longer, but a good test asserts the report is visible first. Don't use waitForTimeout.",
    answer: `await page.getByRole('button', { name: 'Generate report' }).click();
await expect(page.getByText('Monthly report is ready')).toBeVisible({ timeout: 15_000 });
await page.getByRole('button', { name: 'Download' }).click();`,
    Component: DelayedReport,
  },
  {
    id: '06', level: 2, title: 'Button becomes enabled later', skill: 'auto-waiting · toBeEnabled',
    task: 'Click Verify. It is disabled for the first few seconds.',
    hint: 'What does Playwright check before it clicks? Do you need to write any wait at all?',
    answer: `const verify = page.getByRole('button', { name: 'Verify' });
await expect(verify).toBeEnabled({ timeout: 10_000 }); // optional: click() waits for enabled anyway
await verify.click();`,
    Component: EnabledLater,
  },
  {
    id: '07', level: 2, title: 'Wait for the spinner', skill: 'toBeHidden · actionability',
    task: "Load the users and open Anu's profile. A spinner covers the list while it loads.",
    hint: 'The list is in the HTML immediately, but something is on top of it. Wait for the spinner to go away.',
    answer: `await page.getByRole('button', { name: 'Load users' }).click();
await expect(page.getByTestId('spinner')).toBeHidden();
await page.getByRole('button', { name: 'Anu' }).click();`,
    Component: SpinnerOverlay,
  },
  {
    id: '08', level: 2, title: 'Act on the final status', skill: 'expect().toHaveText retries',
    task: 'Start the job, then click Confirm only when the status says Completed. Clicking too early fails.',
    hint: 'Confirm is enabled straight away, so auto-waiting will not save you here. Assert the status text first.',
    answer: `await page.getByRole('button', { name: 'Start job' }).click();
await expect(page.locator('#job-status')).toHaveText('Completed', { timeout: 15_000 });
await page.getByRole('button', { name: 'Confirm' }).click();`,
    Component: FinalStatus,
  },

  // ---------- Level 3: Finding tricky elements ----------
  {
    id: '09', level: 3, title: 'Nested HTML', skill: 'scoping · CSS descendant',
    task: 'Click only the Home link inside div#2. About is a trap: a locator that is too wide matches both.',
    hint: 'Ids that start with a number are not valid in #1 CSS form. Try [id="2"].',
    answer: `await page.locator('[id="2"] a').click();
// or
await page.locator('[id="2"]').getByRole('link', { name: 'Home' }).click();`,
    Component: NestedHtml,
  },
  {
    id: '10', level: 3, title: 'Deeply nested', skill: 'chaining · anchor on a unique parent',
    task: 'Click the Confirm link 7 levels inside #app-shell. There is another Confirm outside it, and a Help link inside it.',
    hint: "Don't write every div. Find something unique near the top, then search inside it.",
    answer: `await page.locator('#app-shell').getByRole('link', { name: 'Confirm' }).click();`,
    Component: DeeplyNested,
  },
  {
    id: '11', level: 3, title: 'Same button, many cards', skill: 'filter({ hasText })',
    task: 'Every plan has a Buy button. Buy the Pro plan.',
    hint: 'Find all the cards, keep only the one that contains "Pro", then find the button inside it.',
    answer: `await page.locator('.plan').filter({ hasText: 'Pro' })
  .getByRole('button', { name: 'Buy' }).click();`,
    Component: ManyCards,
  },
  {
    id: '12', level: 3, title: 'Edit the right table row', skill: "getByRole('row') · filter · multi-step",
    task: "Change Anu's role to Lead and save. Editing anyone else fails.",
    hint: 'Get the row that contains Anu first, and keep using that row for Edit, the select, and Save.',
    answer: `const row = page.getByRole('row').filter({ hasText: 'Anu' });
await row.getByRole('button', { name: 'Edit' }).click();
await row.getByLabel('Role').selectOption('Lead');
await row.getByRole('button', { name: 'Save' }).click();`,
    Component: TableEdit,
  },
  {
    id: '13', level: 3, title: 'Dynamic ids and a hidden copy', skill: 'stable locators · strict mode',
    task: 'Click Download report. Its id changes on every load, and a hidden copy of the button exists in the HTML.',
    hint: "Copying the id won't work next run. Which locators ignore hidden elements by default?",
    answer: `// getByRole only matches visible, accessible elements
await page.getByRole('button', { name: 'Download report' }).click();`,
    Component: DynamicHidden,
  },
];

export function getChallenge(id) {
  return CHALLENGES.find((c) => c.id === id);
}
