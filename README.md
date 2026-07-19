# 🁫 Dominoes Arena

A dominoes tournament tracker with a felt-table UI. The best of the original
`domino` and `dominoes-tournament-tracker` projects, rebuilt into one polished app.

## Features

- **Tournaments** — create a tournament, add players, and track every game night.
- **Live scoreboard** — add rounds as you play, undo mistakes, autosaves to the
  browser so a refresh never loses a round. Lowest total wins; the leader's
  column is highlighted and the top three get gold/silver/bronze dots.
- **Leaderboard** — placement points across all games decide the champion.
- **Seating order picker** — shuffle a fair starting order with one tap.
- **⚡ Quick Match** — a temporary, no-signup match mode. Add 2–8 players and
  score a casual game entirely in the browser. Nothing touches the database;
  an in-progress match resumes automatically on the same device.
- **Night felt** — light/dark theme toggle, remembered per device.

## Stack

Express · EJS · MongoDB (Mongoose) · vanilla JS, no build step.

## Getting started

```bash
npm install
cp .env.example .env   # set MONGODB_URI (only needed for tournaments)
npm start              # http://localhost:3000
```

Without a database the app still runs — Quick Match works with zero setup,
and tournament pages show a friendly "database offline" screen.

## Notes

- `.env` is gitignored. Never commit real connection strings.
- Scoring convention: **lowest** round total is best (standard dominoes point
  counting) — the tournament leaderboard converts each game into placement
  points, so consistent low scorers rise to the top.
