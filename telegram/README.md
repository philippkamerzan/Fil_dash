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
docker compose --profile telegram up -d --build telegram-bot
```

The Docker Telegram service runs `telegram/supervisor.mjs`. It starts a
`cloudflared` quick tunnel inside the container, publishes the Telegram menu
button, answers `/start` / `/play`, checks the current URL, and refreshes it
only when the current URL is broken.

Quick tunnels are account-less Cloudflare development tunnels. They can return
temporary `429 Too Many Requests` / `530` errors. The supervisor backs off when
that happens instead of creating more broken URLs. For a real public launch, use
a fixed domain or a Cloudflare named tunnel instead of `trycloudflare.com`.

Manual PowerShell quick tunnel for development:

```powershell
powershell -ExecutionPolicy Bypass -File D:\FILdash\tools\start-telegram-dev.ps1 -Watch -CheckSeconds 30
```

The watcher keeps the Telegram menu button and `/start` / `/play` replies pointed at the current public URL. It cannot repair old messages that already contain a dead quick-tunnel URL.
