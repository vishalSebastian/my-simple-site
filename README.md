# my-simple-site

A small React (Vite) practice site for QA automation (Playwright / Selenium).

## Pages
- `#/challenges`: Playwright Challenges (13 in 3 levels). A success code only appears when Playwright drives the browser.
- `#/delay`: Start button, "Hello World!" appears after a delay (`#/delay?ms=12000` to change it)
- `#/dynamic-controls`: remove/add a checkbox, enable/disable an input
- `#/progress-bar`: stop the bar at 75%
- `#/login`: fake login (`student` / `Password123`)

## Run locally
    npm install
    npm run dev

## Deploy
Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
Live URL: https://vishalsebastian.github.io/my-simple-site/

## Progress tracking (Supabase)
Challenges take the candidate's name from `?name=` in the URL and log events (`open`, `solved`, `solved_manual`, `fail`, `stuck`, `reveal`, `test_correct`, `test_wrong`) to Supabase, with `automated` = whether Playwright drove the browser.
- One-time setup: run `supabase/schema.sql`, then `supabase/002_challenges.sql`, in the Supabase SQL Editor.
- The website key can only INSERT; data is visible only in your Supabase dashboard.
- See who asked for help without trying: `select * from challenge_summary where asked_help_without_trying;`
