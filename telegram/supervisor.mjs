import { spawn } from "node:child_process";

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const initialPublicGameUrl = process.env.PUBLIC_GAME_URL || process.env.GAME_URL || "";
const gameOrigin = process.env.GAME_ORIGIN || "http://game:5178";
const startLevel = process.env.START_LEVEL || "1";
const checkSeconds = Number.parseInt(process.env.CHECK_SECONDS || "30", 10);
const stableChecks = Number.parseInt(process.env.TUNNEL_STABLE_CHECKS || "2", 10);
const stableGapSeconds = Number.parseInt(process.env.TUNNEL_STABLE_GAP_SECONDS || "8", 10);
const tunnelAttempts = Number.parseInt(process.env.TUNNEL_ATTEMPTS || "3", 10);
const cloudflaredCommand = process.env.CLOUDFLARED_BIN || "cloudflared";
const cloudflaredProtocol = process.env.CLOUDFLARED_PROTOCOL || "http2";

const TEXT = {
  play: "\u0418\u0433\u0440\u0430\u0442\u044c",
  ready: "FIL Dash \u0433\u043e\u0442\u043e\u0432.",
  missingUrl:
    "FIL Dash \u0433\u043e\u0442\u043e\u0432, \u043d\u043e Web App URL \u0435\u0449\u0435 \u043f\u043e\u0434\u043d\u0438\u043c\u0430\u0435\u0442\u0441\u044f. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437 \u0447\u0435\u0440\u0435\u0437 \u043f\u0430\u0440\u0443 \u0441\u0435\u043a\u0443\u043d\u0434.",
  startCommand: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c FIL Dash",
  shortDescription:
    "\u0414\u0438\u043d\u0430\u043c\u0438\u0447\u043d\u044b\u0439 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u0440 FIL Dash",
  description:
    "FIL Dash - \u0434\u0438\u043d\u0430\u043c\u0438\u0447\u043d\u044b\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043d\u044b\u0439 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u0440: \u043a\u0443\u0431\u0438\u043a, \u0431\u0443\u0441\u0442\u0435\u0440\u044b, \u043f\u043e\u0440\u0442\u0430\u043b\u044b, \u0441\u0430\u043c\u043e\u043b\u0435\u0442\u0438\u043a \u0438 \u0431\u044b\u0441\u0442\u0440\u044b\u0435 \u0440\u0435\u0441\u0442\u0430\u0440\u0442\u044b.",
};

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let currentGameUrl = initialPublicGameUrl;
let tunnelProcess = null;
let offset = 0;
let refreshPromise = null;
let nextRefreshAt = 0;
let consecutiveRefreshFailures = 0;

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

async function api(method, payload = undefined, attempt = 1) {
  const timeoutMs = Number.isFinite(payload?.timeout) ? (payload.timeout + 10) * 1000 : 20000;
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: timeout.signal,
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
  } finally {
    timeout.done();
  }
}

async function isGameUrlHealthy(url) {
  if (!url) return false;
  const timeout = withTimeout(12000);
  try {
    const response = await fetch(url, { signal: timeout.signal });
    if (response.status !== 200) return false;
    const body = await response.text();
    return body.includes("bootLoading") && body.includes("game.js");
  } catch {
    return false;
  } finally {
    timeout.done();
  }
}

async function waitForStableGameUrl(url) {
  for (let i = 0; i < stableChecks; i++) {
    if (!(await isGameUrlHealthy(url))) {
      return false;
    }
    if (i < stableChecks - 1) {
      await sleep(stableGapSeconds * 1000);
    }
  }
  return true;
}

function createGameUrl(tunnelBaseUrl) {
  const url = new URL(tunnelBaseUrl);
  url.searchParams.set("level", startLevel);
  url.searchParams.set("r", `auto-${Math.floor(Date.now() / 1000)}`);
  return url.toString();
}

function stopProcess(processToStop) {
  if (!processToStop || processToStop.killed) return;
  try {
    processToStop.kill("SIGTERM");
  } catch {
    // Process is already gone.
  }
}

function startQuickTunnel() {
  return new Promise((resolve, reject) => {
    const child = spawn(cloudflaredCommand, [
      "tunnel",
      "--url",
      gameOrigin,
      "--no-autoupdate",
      "--protocol",
      cloudflaredProtocol,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let resolved = false;
    let recentOutput = "";
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      stopProcess(child);
      reject(new Error(`cloudflared did not print a tunnel URL in time: ${recentOutput.trim()}`));
    }, 50000);

    const handleOutput = (chunk) => {
      const text = chunk.toString("utf8");
      recentOutput = `${recentOutput}${text}`.slice(-1200);
      const match = text.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/i);
      if (!match || resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve({ process: child, baseUrl: match[0] });
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);
    child.on("error", (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      reject(new Error(`cloudflared exited before ready with code ${code}: ${recentOutput.trim()}`));
    });
  });
}

async function setTelegramMenu(publicGameUrl) {
  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: TEXT.play,
      web_app: { url: publicGameUrl },
    },
  });
}

async function publishBotProfile() {
  await api("setMyCommands", {
    commands: [
      { command: "start", description: TEXT.startCommand },
      { command: "play", description: TEXT.play },
    ],
  });
  await api("setMyShortDescription", { short_description: TEXT.shortDescription });
  await api("setMyDescription", { description: TEXT.description });
}

async function getTelegramMenuUrl() {
  try {
    const result = await api("getChatMenuButton", {});
    return result?.web_app?.url || "";
  } catch {
    return "";
  }
}

async function createHealthyTunnelUrl() {
  let lastError = null;
  for (let attempt = 1; attempt <= tunnelAttempts; attempt++) {
    let candidate = null;
    try {
      candidate = await startQuickTunnel();
      const publicGameUrl = createGameUrl(candidate.baseUrl);
      if (await waitForStableGameUrl(publicGameUrl)) {
        stopProcess(tunnelProcess);
        tunnelProcess = candidate.process;
        return publicGameUrl;
      }
      lastError = new Error(`candidate did not become stable: ${publicGameUrl}`);
    } catch (error) {
      lastError = error;
    }
    stopProcess(candidate?.process);
    console.warn(`Tunnel attempt ${attempt}/${tunnelAttempts} failed: ${lastError.message}`);
    await sleep(2000);
  }
  throw lastError || new Error("could not create a healthy tunnel");
}

async function refreshPublicUrl(reason) {
  if (refreshPromise) {
    return refreshPromise;
  }
  const now = Date.now();
  if (now < nextRefreshAt) {
    const waitSeconds = Math.ceil((nextRefreshAt - now) / 1000);
    throw new Error(`refresh is in backoff for ${waitSeconds}s`);
  }

  refreshPromise = (async () => {
    console.warn(`Refreshing Telegram WebApp URL: ${reason}`);
    try {
      const publicGameUrl = await createHealthyTunnelUrl();
      await setTelegramMenu(publicGameUrl);
      currentGameUrl = publicGameUrl;
      consecutiveRefreshFailures = 0;
      nextRefreshAt = 0;
      console.log(`Telegram game URL: ${currentGameUrl}`);
      return currentGameUrl;
    } catch (error) {
      consecutiveRefreshFailures += 1;
      const delaySeconds = Math.min(900, 30 * 2 ** Math.min(consecutiveRefreshFailures - 1, 5));
      nextRefreshAt = Date.now() + delaySeconds * 1000;
      throw new Error(`${error.message}; retrying in ${delaySeconds}s`);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function ensurePublicUrl() {
  if (await waitForStableGameUrl(currentGameUrl)) {
    return currentGameUrl;
  }
  return refreshPublicUrl("current URL is not healthy");
}

function buildReplyMarkup(publicGameUrl) {
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
  let publicGameUrl = "";
  try {
    publicGameUrl = await ensurePublicUrl();
  } catch (error) {
    console.error(`Could not prepare WebApp URL for /start: ${error.message}`);
  }
  const reply_markup = buildReplyMarkup(publicGameUrl);
  await api("sendMessage", {
    chat_id: chatId,
    text: reply_markup ? TEXT.ready : TEXT.missingUrl,
    reply_markup,
  });
}

async function initializeOffset() {
  const updates = await api("getUpdates", {
    timeout: 0,
    allowed_updates: ["message"],
  });
  if (updates.length > 0) {
    offset = Math.max(...updates.map((update) => update.update_id)) + 1;
  }
}

async function pollTelegram() {
  console.log("Bot polling started.");
  await initializeOffset();
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
}

async function monitorPublicUrl() {
  while (true) {
    await sleep(checkSeconds * 1000);
    try {
      if (!(await isGameUrlHealthy(currentGameUrl))) {
        await refreshPublicUrl("health check failed");
      }
    } catch (error) {
      console.error(`Health monitor error: ${error.message}`);
    }
  }
}

process.on("SIGTERM", () => {
  stopProcess(tunnelProcess);
  process.exit(0);
});
process.on("SIGINT", () => {
  stopProcess(tunnelProcess);
  process.exit(0);
});

await publishBotProfile();
if (!currentGameUrl) {
  currentGameUrl = await getTelegramMenuUrl();
  if (currentGameUrl) {
    console.log(`Using Telegram menu URL as current game URL: ${currentGameUrl}`);
  }
}
ensurePublicUrl().catch((error) => {
  console.error(`Initial WebApp URL preparation failed, will keep retrying in monitor: ${error.message}`);
});
void monitorPublicUrl();
await pollTelegram();
