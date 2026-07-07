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
