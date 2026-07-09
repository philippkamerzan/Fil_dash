# Telegram publication

The bot token must be provided only through the environment.

```powershell
$env:TELEGRAM_BOT_TOKEN='<set-in-shell-only>'
$env:PUBLIC_GAME_URL='<public-https-url>'
node D:\FILdash\telegram\publish.mjs
```

`publish.mjs` updates bot commands, description, short description, and the Web App menu button.

For local long-polling replies:

```powershell
$env:TELEGRAM_BOT_TOKEN='<set-in-shell-only>'
$env:PUBLIC_GAME_URL='<public-https-url>'
node D:\FILdash\telegram\bot.mjs
```

Telegram Web Apps require a public HTTPS URL. A local `http://127.0.0.1` server is useful for development, but it is not a real Telegram publication target.

Docker:

```powershell
$env:TELEGRAM_BOT_TOKEN=[Environment]::GetEnvironmentVariable('TELEGRAM_BOT_TOKEN', 'User')
$env:PUBLIC_GAME_URL='https://your-public-game-url.example/?level=1'
docker compose --profile publish run --rm telegram-publish
docker compose --profile telegram up -d telegram-bot
```

Auto-refresh quick tunnel URL for development:

```powershell
powershell -ExecutionPolicy Bypass -File D:\FILdash\tools\start-telegram-dev.ps1 -Watch -RefreshMinutes 60
```

The watcher keeps the Telegram menu button and `/start` / `/play` replies pointed at the current public URL. It cannot repair old messages that already contain a dead quick-tunnel URL.
