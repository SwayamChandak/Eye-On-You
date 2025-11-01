// Time Counter background service worker (MV3)
import { sendEmailNotification } from "./util_email.js";

// Storage keys
const STORAGE_KEYS = {
  timeByHost: "timeByHost",
  websiteData: "websiteData", // { host: { name, favicon, time } }
  isTrackingEnabled: "isTrackingEnabled",
  credentials: "credentials", // { username, passwordHash, salt, email }
};

// In-memory session state
let activeTabId = null;
let activeHost = null;
let lastTickMs = Date.now();

// Track per second using alarms (MV3 safe)
const ALARM_NAME = "time-counter-tick";

chrome.runtime.onInstalled.addListener(async () => {
  const { isTrackingEnabled } = await chrome.storage.local.get(
    STORAGE_KEYS.isTrackingEnabled
  );
  if (typeof isTrackingEnabled === "undefined") {
    await chrome.storage.local.set({ [STORAGE_KEYS.isTrackingEnabled]: true });
  }

  // Migrate old timeByHost data to new websiteData format
  await migrateOldData();

  await ensureAlarm();
  await initActiveContext();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await initActiveContext();
});

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 / 60 }); // every second
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.round((now - lastTickMs) / 1000));
  lastTickMs = now;

  const { isTrackingEnabled } = await chrome.storage.local.get(
    STORAGE_KEYS.isTrackingEnabled
  );
  if (!isTrackingEnabled) return;

  if (!activeHost || !elapsedSec) return;

  const state = await chrome.idle.queryState(15);
  if (state !== "active") return;

  // Count even when the window is minimized or unfocused.

  // Update both legacy timeByHost and new websiteData
  const timeData =
    (await chrome.storage.local.get(STORAGE_KEYS.timeByHost))[
      STORAGE_KEYS.timeByHost
    ] || {};
  timeData[activeHost] = (timeData[activeHost] || 0) + elapsedSec;
  await chrome.storage.local.set({ [STORAGE_KEYS.timeByHost]: timeData });

  // Update website data with new time
  const { websiteData: existingWebsiteData } = await chrome.storage.local.get(
    STORAGE_KEYS.websiteData
  );
  if (existingWebsiteData && existingWebsiteData[activeHost]) {
    existingWebsiteData[activeHost].time =
      (existingWebsiteData[activeHost].time || 0) + elapsedSec;
    await chrome.storage.local.set({
      [STORAGE_KEYS.websiteData]: existingWebsiteData,
    });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  const tab = await chrome.tabs.get(activeTabId).catch(() => null);
  if (tab?.url) {
    const websiteData = await getWebsiteData(tab.url);
    activeHost = websiteData?.host || null;

    // Store website data if not already stored
    if (websiteData) {
      await storeWebsiteData(websiteData);
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    const websiteData = await getWebsiteData(changeInfo.url);
    activeHost = websiteData?.host || null;

    // Store website data if not already stored
    if (websiteData) {
      await storeWebsiteData(websiteData);
    }
  }
});

chrome.windows.onFocusChanged.addListener(async () => {
  if (activeTabId == null) return;
  const tab = await chrome.tabs.get(activeTabId).catch(() => null);
  if (tab?.url) {
    const websiteData = await getWebsiteData(tab.url);
    activeHost = websiteData?.host || null;

    // Store website data if not already stored
    if (websiteData) {
      await storeWebsiteData(websiteData);
    }
  }
});

async function initActiveContext() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tab?.url) {
      activeTabId = tab.id;
      const websiteData = await getWebsiteData(tab.url);
      activeHost = websiteData?.host || null;

      // Store website data if not already stored
      if (websiteData) {
        await storeWebsiteData(websiteData);
      }
    }
  } catch {}
}

function extractHost(url) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return null;
  }
}

function extractWebsiteName(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname;

    // Remove www. prefix if present
    let name = hostname.replace(/^www\./, "");

    // Extract the main domain name (remove subdomains for common cases)
    const parts = name.split(".");
    if (parts.length > 2) {
      // Check if it's a common subdomain pattern
      const commonSubdomains = [
        "mail",
        "blog",
        "shop",
        "store",
        "news",
        "support",
        "help",
        "docs",
        "app",
      ];
      if (commonSubdomains.includes(parts[0])) {
        name = parts.slice(1).join(".");
      }
    }

    // Capitalize first letter of each word
    return name
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(".");
  } catch {
    return null;
  }
}

function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return null;
  }
}

async function getWebsiteData(url) {
  const host = extractHost(url);
  if (!host) return null;

  const name = extractWebsiteName(url);
  const favicon = getFaviconUrl(url);

  return { host, name, favicon };
}

async function storeWebsiteData(websiteData) {
  const { websiteData: existingData } = await chrome.storage.local.get(
    STORAGE_KEYS.websiteData
  );
  const data = existingData || {};

  // Only store if not already present or if data has changed
  if (
    !data[websiteData.host] ||
    data[websiteData.host].name !== websiteData.name
  ) {
    data[websiteData.host] = {
      name: websiteData.name,
      favicon: websiteData.favicon,
      time: data[websiteData.host]?.time || 0,
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.websiteData]: data });
  }
}

async function migrateOldData() {
  const { timeByHost, websiteData } = await chrome.storage.local.get([
    STORAGE_KEYS.timeByHost,
    STORAGE_KEYS.websiteData,
  ]);

  // If we have old timeByHost data but no websiteData, migrate it
  if (timeByHost && !websiteData) {
    const migratedData = {};

    for (const [host, time] of Object.entries(timeByHost)) {
      if (time > 0) {
        const name = extractWebsiteName(`https://${host}`);
        const favicon = getFaviconUrl(`https://${host}`);

        migratedData[host] = {
          name: name || host,
          favicon: favicon,
          time: time,
        };
      }
    }

    if (Object.keys(migratedData).length > 0) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.websiteData]: migratedData,
      });
    }
  }
}

// Message handlers for popup/options
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Use async flow via sendResponse(true) and return true
  (async () => {
    if (message?.type === "getStats") {
      const data =
        (await chrome.storage.local.get([
          STORAGE_KEYS.websiteData,
          STORAGE_KEYS.isTrackingEnabled,
        ])) || {};
      sendResponse({
        websiteData: data[STORAGE_KEYS.websiteData] || {},
        isTrackingEnabled: data[STORAGE_KEYS.isTrackingEnabled] !== false,
      });
      return;
    }

    if (message?.type === "clearStats") {
      // Require credentials: message { username, passwordHash }
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[
        STORAGE_KEYS.credentials
      ];
      const ok = !!(
        creds &&
        creds.username === message.username &&
        creds.passwordHash === message.passwordHash
      );
      if (!ok) {
        sendResponse({ ok: false, error: "Unauthorized" });
        return;
      }
      await chrome.storage.local.set({
        [STORAGE_KEYS.timeByHost]: {},
        [STORAGE_KEYS.websiteData]: {},
      });

      // Send email notification if email is stored
      if (creds && creds.email) {
        try {
          await sendEmailNotification(
            "clear_data",
            creds.email,
            creds.username
          );
        } catch (error) {
          console.error("Failed to send clear data email:", error);
        }
      }

      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "setTrackingEnabled") {
      // Requires prior auth check by caller
      await chrome.storage.local.set({
        [STORAGE_KEYS.isTrackingEnabled]: !!message.enabled,
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "getCredentialsSet") {
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[
        STORAGE_KEYS.credentials
      ];
      sendResponse({
        set: !!(creds && creds.username && creds.passwordHash && creds.salt),
      });
      return;
    }

    if (message?.type === "setCredentials") {
      // message: { username, passwordHash, salt, email }
      if (!message.username || !message.passwordHash || !message.salt) {
        sendResponse({ ok: false, error: "Invalid credentials payload" });
        return;
      }
      await chrome.storage.local.set({
        [STORAGE_KEYS.credentials]: {
          username: String(message.username),
          passwordHash: String(message.passwordHash),
          salt: String(message.salt),
          email: String(message.email || ""),
        },
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "verifyCredentials") {
      // message: { username, passwordHash }
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[
        STORAGE_KEYS.credentials
      ];
      const ok = !!(
        creds &&
        creds.username === message.username &&
        creds.passwordHash === message.passwordHash
      );
      sendResponse({ ok });
      return;
    }

    if (message?.type === "sendEmail") {
      // message: { event, email, username }
      try {
        const result = await sendEmailNotification(
          message.event,
          message.email,
          message.username
        );
        sendResponse({ ok: result.success, error: result.error });
        return;
      } catch (error) {
        console.error("Email sending error:", error);
        sendResponse({ ok: false, error: error.message });
        return;
      }
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })();
  return true;
});
