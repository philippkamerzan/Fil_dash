const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const publicGameUrl = process.env.PUBLIC_GAME_URL || process.env.GAME_URL;

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
          text: "Играть",
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
    text: reply_markup ? "FIL Dash готов." : "FIL Dash готов. Для кнопки Web App задайте PUBLIC_GAME_URL.",
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
