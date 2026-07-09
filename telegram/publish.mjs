const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const publicGameUrl = process.env.PUBLIC_GAME_URL || process.env.GAME_URL;

const TEXT = {
  play: "\u0418\u0433\u0440\u0430\u0442\u044c",
  startCommand: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c FIL Dash",
  shortDescription:
    "\u0414\u0438\u043d\u0430\u043c\u0438\u0447\u043d\u044b\u0439 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u0440 FIL Dash",
  description:
    "FIL Dash - \u0434\u0438\u043d\u0430\u043c\u0438\u0447\u043d\u044b\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043d\u044b\u0439 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u0440: \u043a\u0443\u0431\u0438\u043a, \u0431\u0443\u0441\u0442\u0435\u0440\u044b, \u043f\u043e\u0440\u0442\u0430\u043b\u044b, \u0441\u0430\u043c\u043e\u043b\u0435\u0442\u0438\u043a, \u043f\u0435\u0440\u0435\u0432\u043e\u0440\u043e\u0442 \u0433\u0440\u0430\u0432\u0438\u0442\u0430\u0446\u0438\u0438 \u0438 \u0431\u044b\u0441\u0442\u0440\u044b\u0435 \u0440\u0435\u0441\u0442\u0430\u0440\u0442\u044b.",
};

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
    { command: "start", description: TEXT.startCommand },
    { command: "play", description: TEXT.play },
  ],
});

await api("setMyShortDescription", {
  short_description: TEXT.shortDescription,
});

await api("setMyDescription", {
  description: TEXT.description,
});

if (requireHttps(publicGameUrl)) {
  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: TEXT.play,
      web_app: { url: publicGameUrl },
    },
  });
  console.log(`Web App menu button published: ${publicGameUrl}`);
} else {
  console.log("Bot profile and commands updated. Set PUBLIC_GAME_URL to publish the Web App menu button.");
}
