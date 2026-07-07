# FIL Dash

Static browser build for the platformer described in `output/TZ_dynamic_platformer_current_prompt.docx`.

Run locally:

```powershell
cd D:\FILdash\game
python -m http.server 5177
```

Open `http://127.0.0.1:5177/`.

Run locally with the shared leaderboard API:

```powershell
cd D:\FILdash\game
node .\server.mjs
```

Open `http://127.0.0.1:5178/`. Scores are stored in `data\leaderboard.json`.

Telegram Web App:

- host this folder on a public HTTPS URL;
- set `PUBLIC_GAME_URL` to that URL;
- run `node ..\telegram\publish.mjs` with `TELEGRAM_BOT_TOKEN` in the environment.
