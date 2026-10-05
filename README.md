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
