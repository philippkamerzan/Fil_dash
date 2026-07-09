const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const publicGameUrl = process.env.PUBLIC_GAME_URL || process.env.GAME_URL;

const TEXT = {
  play: "\u0418\u0433\u0440\u0430\u0442\u044c",
  ready: "FIL Dash \u0433\u043e\u0442\u043e\u0432.",
  missingUrl:
    "FIL Dash \u0433\u043e\u0442\u043e\u0432. \u0414\u043b\u044f \u043a\u043d\u043e\u043f\u043a\u0438 Web App \u0437\u0430\u0434\u0430\u0439\u0442\u0435 PUBLIC_GAME_URL.",
};

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

function requireHttps(url) {
  if (!url) return;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("PUBLIC_GAME_URL must be https for Telegram Web App buttons.");
  }
}

requireHttps(publicGameUrl);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, payload = undefined, attempt = 1) {
  try {
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
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(900 * attempt);
    return api(method, payload, attempt + 1);
  }
}

function buildReplyMarkup() {
  if (!publicGameUrl) return undefined;
  return {
    inline_keyboard: [
      [
        {
          text: TEXT.play,
          web_app: { url: publicGameUrl },
        },
      ],
    ],
  };
}

async function sendPlayMessage(chatId) {
  const reply_markup = buildReplyMarkup();
  await api("sendMessage", {
    chat_id: chatId,
    text: reply_markup ? TEXT.ready : TEXT.missingUrl,
    reply_markup,
  });
}

let offset = 0;
console.log("Bot polling started.");

while (true) {
  try {
    const updates = await api("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = update.update_id + 1;
      const message = update.message;
      if (!message?.chat?.id) continue;
      const text = message.text || "";
      if (text.startsWith("/start") || text.startsWith("/play")) {
        await sendPlayMessage(message.chat.id);
      }
    }
  } catch (error) {
    console.error(`Polling error: ${error.message}`);
    await sleep(2500);
  }
}
