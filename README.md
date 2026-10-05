# my-simple-site

A small React (Vite) practice site for QA automation (Playwright / Selenium).

## Pages
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
Learn Locators asks for the candidate's name and logs events (`start`, `test_correct`, `test_wrong`, `stuck`, `reveal`) to Supabase.
- One-time setup: run `supabase/schema.sql` in the Supabase SQL Editor.
- The website key can only INSERT; data is visible only in your Supabase dashboard.
- See who asked for help without trying: `select * from locator_summary where asked_help_without_trying;`
