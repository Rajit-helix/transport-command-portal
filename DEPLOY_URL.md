# Deploy to a Public URL (Render)

## What is already fixed
- Frontend now defaults to same-origin API (`/api`) instead of hardcoded `localhost`.
- Socket client now defaults to current site origin.

## One-time setup
1. Push this repo to GitHub.
2. In Render, click `New +` -> `Blueprint`.
3. Select your repo (Render will detect `render.yaml`).
4. During setup, set `CORS_ORIGINS` to your Render app URL.
   - Example: `https://projectcodex-app.onrender.com`
5. Deploy.

## After first deploy
1. Open Render Shell for the web service.
2. Run:
   - `npm run migrate:up`
   - `npm run seed`

## Use the app
- Open your public URL directly in browser (no localhost needed).
