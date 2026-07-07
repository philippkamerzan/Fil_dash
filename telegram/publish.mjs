const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const publicGameUrl = process.env.PUBLIC_GAME_URL || process.env.GAME_URL;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

async function api(method, payload = undefined) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(`${method} failed: ${json.description || response.statusText}`);
  }
  return json.result;
}

function requireHttps(url) {
  if (!url) return false;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("PUBLIC_GAME_URL must be https for Telegram Web App publication.");
  }
  return true;
}

const me = await api("getMe");
console.log(`Bot: @${me.username}`);

await api("setMyCommands", {
  commands: [
    { command: "start", description: "Запустить FIL Dash" },
    { command: "play", description: "Играть" },
  ],
});

await api("setMyShortDescription", {
  short_description: "Динамичный платформер FIL Dash",
});

await api("setMyDescription", {
  description:
    "FIL Dash - динамичный браузерный платформер: кубик, бустеры, порталы, самолетик, переворот гравитации и быстрые рестарты.",
});

if (requireHttps(publicGameUrl)) {
  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Играть",
      web_app: { url: publicGameUrl },
    },
  });
  console.log(`Web App menu button published: ${publicGameUrl}`);
} else {
  console.log("Bot profile and commands updated. Set PUBLIC_GAME_URL to publish the Web App menu button.");
}
