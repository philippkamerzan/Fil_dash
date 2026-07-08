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

Levels:

- the current full route is registered as `level-1` / `FIL Dash 1`;
- open a specific level with `?level=1` or `?level=level-1`;
- the 3D space route is registered as `level-2` / `FIL Dash 2: Space Run`;
- the jungle route is registered as `level-3` / `FIL Dash 3: Джунгли`;
- the Titanic route is registered as `level-4` / `FIL Dash 4: Титаник`;
- add future levels as new modules and register them in `src\levels.js`;
- local and shared leaderboard records are scoped by `levelId`, so new levels do not mix scores with Level 1.

Telegram Web App:

- host this folder on a public HTTPS URL;
- set `PUBLIC_GAME_URL` to that URL;
- run `node ..\telegram\publish.mjs` with `TELEGRAM_BOT_TOKEN` in the environment.
