# 🁫 Dominoes Arena

A dominoes tournament tracker with a felt-table UI — built as a **static site +
Cloudflare Pages Functions**, deployable to **pages.dev** in minutes. Data is
stored in **Workers KV** (tournaments) and the browser (Quick Match).

## Features

- **Tournaments** — create a tournament, add players, track every game night.
- **Live scoreboard** — add rounds as you play, undo mistakes, autosaves to the
  browser so a refresh never loses a round. Lowest total wins; the leader's
  column is highlighted and the top three get gold/silver/bronze dots.
- **Leaderboard** — placement points across all games decide the champion.
- **Seating order picker** — shuffle a fair starting order with one tap.
- **⚡ Quick Match** — a temporary, no-signup match mode. Add 2–8 players and
  score a casual game entirely in the browser. Never touches the server.
- **Night felt** — light/dark theme toggle, remembered per device.

## Architecture

```
public/            static site (HTML + CSS + vanilla JS)
functions/api/     Cloudflare Pages Functions — REST API backed by Workers KV
wrangler.toml      Pages config + KV binding (ARENA)
```

No build step. No framework. No database server.

## Deploy to Cloudflare Pages (pages.dev)

1. **Push this repo to GitHub.**

2. **Create the KV namespace** (one time):
   ```bash
   npx wrangler login
   npx wrangler kv namespace create ARENA
   ```
   Copy the returned `id` into `wrangler.toml`.

3. **Create the Pages project** — in the Cloudflare dashboard:
   *Workers & Pages → Create → Pages → Connect to Git* → pick this repo.
   - Build command: *(leave empty)*
   - Build output directory: `public`

4. **Bind KV** — in the Pages project: *Settings → Bindings → Add → KV namespace*,
   variable name `ARENA`, select the namespace from step 2. Redeploy.

Done — your app is live at `https://<project>.pages.dev`.

### Or deploy straight from the CLI

```bash
npm install
npx wrangler login
npx wrangler kv namespace create ARENA   # put id into wrangler.toml
npm run deploy
```

## Local development

```bash
npm install
npm run dev        # http://localhost:8788 with a local KV emulator
```

## Notes

- **GitHub Pages?** Not supported — GH Pages is static-only and can't run the
  API. Quick Match alone would work there, but tournaments need the
  Functions + KV backend, which pages.dev provides for free.
- Scoring convention: **lowest** round total is best (standard dominoes point
  counting) — the leaderboard converts each game into placement points.
- There is no auth: anyone with your pages.dev URL can edit tournaments.
  Fine for friends; add Cloudflare Access if you want to lock it down.
