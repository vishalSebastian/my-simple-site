# my-simple-site

A small React (Vite) practice site for QA automation (Playwright / Selenium).

## Pages
- `#/challenges`: Playwright Challenges (13 in 3 levels). A success code only appears when Playwright drives the browser.
- `#/delay`: Start button, "Hello World!" appears after a delay (`#/delay?ms=12000` to change it)
- `#/dynamic-controls`: remove/add a checkbox, enable/disable an input
- `#/progress-bar`: stop the bar at 75%
- `#/practice-login`: fake login (`student` / `Password123`)

## Run locally
    npm install
    npm run dev          # website only, data kept in the browser (accounts below)

    # with the real API: create .env with DATABASE_URL and JWT_SECRET, then in two terminals
    npm run dev:api      # Node.js API on http://localhost:3001/api
    npm run dev:server   # website, /api calls go to the local API

## Deploy
- **Vercel** (main site, website + API): every push to `main` redeploys. See setup below.
- GitHub Pages (`.github/workflows/deploy.yml`) still publishes the website, but the onboarding app needs the API, so use the Vercel URL for it.

## Progress tracking (Supabase)
Challenges take the candidate's name from `?name=` in the URL and log events (`open`, `solved`, `solved_manual`, `fail`, `stuck`, `reveal`, `test_correct`, `test_wrong`) to Supabase, with `automated` = whether Playwright drove the browser.
- One-time setup: run `supabase/schema.sql`, then `supabase/002_challenges.sql`, in the Supabase SQL Editor.
- The website key can only INSERT; data is visible only in your Supabase dashboard.
- See who asked for help without trying: `select * from challenge_summary where asked_help_without_trying;`

## Employee Onboarding app
A full app for candidates to automate: `#/signup`, `#/login`, `#/onboarding` (employee) and `#/hr` (HR).

- Website (React) + **Node.js API** (Express, `server/app.js`), both on **Vercel**.
- Supabase is used **only as a Postgres database** (tables in `supabase/003_onboarding.sql`). No Supabase Auth, no Storage, no emails.
- Sign up adds a user (password hashed with bcrypt). Log in returns a **JWT** (1 hour), stored in localStorage as `app-session`
  and sent as `Authorization: Bearer <token>`.

### API (all under `/api`)
| Method | Path | Who |
|---|---|---|
| POST | `/auth/signup` `{ fullName, email, password }` | anyone |
| POST | `/auth/login` `{ email, password }` returns `{ access_token, expires_at, user }` | anyone |
| GET | `/auth/me` | logged in |
| GET / PUT | `/onboarding` (PUT saves the draft) | employee (HR: `?userId=`) |
| POST | `/onboarding/submit` | employee |
| GET / POST | `/documents` `{ docType, fileName, mimeType, contentBase64 }` (max 3 MB) | employee (HR: `?userId=`) |
| DELETE | `/documents/:id` | employee |
| GET | `/documents/:id/file` | owner or HR |
| GET | `/hr/employees` | HR |
| POST | `/hr/employees/:id/review` `{ decision: "approved" or "rejected", comment }` | HR |

### Setup (one time)
1. **Supabase** > SQL Editor: run `supabase/003_onboarding.sql`.
2. **Supabase** > Connect: copy the **Transaction pooler** connection string (port 6543) and put your database password in it.
3. **Vercel** > Add New > Project > import this GitHub repo > Environment Variables:
   - `DATABASE_URL` = the connection string from step 2
   - `JWT_SECRET` = any long random text
   Then Deploy. Every `git push` redeploys automatically.
4. Sign up on the site, then make yourself HR (Supabase SQL Editor):
   `update app.users set role = 'hr' where email = 'your@email.com';`

### Local accounts (`npm run dev`)
- HR: `hr@demo.test` / `Password@123`
- Employee (already submitted): `rahul@demo.test` / `Password@123`

### data-testid naming
Pattern: `<page>-<thing>-<type>`, e.g. `login-email-input`, `onboarding-next-button`, `hr-approve-button`.

| Area | Main test ids |
|---|---|
| Header | `brand`, `nav-home`, `nav-onboarding`, `nav-hr`, `nav-challenges`, `nav-practice`, `header-login-button`, `header-signup-button`, `header-user-menu`, `header-user-name`, `header-user-role`, `header-logout-button` |
| Login | `login-signup-success`, `login-email-input`, `login-password-input`, `login-password-toggle`, `login-submit-button`, `login-error`, `login-session-expired`, `login-signup-link` |
| Sign up | `signup-fullname-input`, `signup-email-input`, `signup-password-input`, `signup-confirm-password-input`, `signup-terms-checkbox`, `signup-submit-button`, `signup-error`, `signup-password-strength`, `signup-password-rule-<length\|uppercase\|lowercase\|number\|special>` (has `data-valid`) |
| Onboarding | `onboarding-status-badge`, `onboarding-step-<personal\|job\|documents\|review>`, `onboarding-<first-name\|last-name\|phone\|dob\|address\|emergency-name\|emergency-phone\|job-title\|start-date>-input`, `onboarding-department-select`, `onboarding-location-select`, `onboarding-employment-type-<full-time\|part-time\|contract>`, `onboarding-back-button`, `onboarding-next-button`, `onboarding-confirm-checkbox`, `onboarding-submit-button`, `onboarding-rejected-alert`, `onboarding-hr-comment`, `onboarding-submitted-message`, `onboarding-approved-message` |
| Uploads | `upload-<photo\|id-proof\|resume>-dropzone`, `upload-<type>-input` (use `setInputFiles`), `upload-<type>-error`, `document-<type>`, `document-<type>-name`, `document-<type>-preview`, `document-<type>-open-link`, `document-<type>-remove-button` |
| Review / status | `review-<field>` and `status-<field>` (e.g. `review-first-name`), `review-no-documents` |
| HR | `hr-stat-<total\|submitted\|approved\|rejected>-value`, `hr-status-filter`, `hr-search-input`, `hr-employee-table`, `hr-employee-row` (has `data-email`), `hr-employee-name`, `hr-employee-status`, `hr-review-button`, `hr-review-drawer`, `hr-detail-<field>`, `hr-comment-input`, `hr-approve-button`, `hr-reject-button`, `hr-confirm-modal`, `hr-confirm-yes-button`, `hr-confirm-cancel-button`, `hr-empty-state` |
| Toasts | `toast-draft-saved`, `toast-upload-success`, `toast-submitted`, `toast-approved`, `toast-rejected` |
