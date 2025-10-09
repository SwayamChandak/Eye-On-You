// Time Counter background service worker (MV3)

// Storage keys
const STORAGE_KEYS = {
  timeByHost: 'timeByHost',
  isTrackingEnabled: 'isTrackingEnabled',
  credentials: 'credentials' // { username, passwordHash, salt }
};

// In-memory session state
let activeTabId = null;
let activeHost = null;
let lastTickMs = Date.now();

// Track per second using alarms (MV3 safe)
const ALARM_NAME = 'time-counter-tick';

chrome.runtime.onInstalled.addListener(async () => {
  const { isTrackingEnabled } = await chrome.storage.local.get(STORAGE_KEYS.isTrackingEnabled);
  if (typeof isTrackingEnabled === 'undefined') {
    await chrome.storage.local.set({ [STORAGE_KEYS.isTrackingEnabled]: true });
  }
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

  const { isTrackingEnabled } = await chrome.storage.local.get(STORAGE_KEYS.isTrackingEnabled);
  if (!isTrackingEnabled) return;

  if (!activeHost || !elapsedSec) return;

  const state = await chrome.idle.queryState(15);
  if (state !== 'active') return;

  // Count even when the window is minimized or unfocused.

  const timeData = (await chrome.storage.local.get(STORAGE_KEYS.timeByHost))[STORAGE_KEYS.timeByHost] || {};
  timeData[activeHost] = (timeData[activeHost] || 0) + elapsedSec;
  await chrome.storage.local.set({ [STORAGE_KEYS.timeByHost]: timeData });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  const tab = await chrome.tabs.get(activeTabId).catch(() => null);
  activeHost = extractHost(tab?.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    activeHost = extractHost(changeInfo.url);
  }
});

chrome.windows.onFocusChanged.addListener(async () => {
  if (activeTabId == null) return;
  const tab = await chrome.tabs.get(activeTabId).catch(() => null);
  activeHost = extractHost(tab?.url);
});

async function initActiveContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) {
      activeTabId = tab.id;
      activeHost = extractHost(tab.url);
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

// Message handlers for popup/options
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Use async flow via sendResponse(true) and return true
  (async () => {
    if (message?.type === 'getStats') {
      const data = (await chrome.storage.local.get([STORAGE_KEYS.timeByHost, STORAGE_KEYS.isTrackingEnabled])) || {};
      sendResponse({
        timeByHost: data[STORAGE_KEYS.timeByHost] || {},
        isTrackingEnabled: data[STORAGE_KEYS.isTrackingEnabled] !== false
      });
      return;
    }

    if (message?.type === 'clearStats') {
      // Require credentials: message { username, passwordHash }
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[STORAGE_KEYS.credentials];
      const ok = !!(creds && creds.username === message.username && creds.passwordHash === message.passwordHash);
      if (!ok) {
        sendResponse({ ok: false, error: 'Unauthorized' });
        return;
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.timeByHost]: {} });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'setTrackingEnabled') {
      // Requires prior auth check by caller
      await chrome.storage.local.set({ [STORAGE_KEYS.isTrackingEnabled]: !!message.enabled });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'getCredentialsSet') {
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[STORAGE_KEYS.credentials];
      sendResponse({ set: !!(creds && creds.username && creds.passwordHash && creds.salt) });
      return;
    }

    if (message?.type === 'setCredentials') {
      // message: { username, passwordHash, salt }
      if (!message.username || !message.passwordHash || !message.salt) {
        sendResponse({ ok: false, error: 'Invalid credentials payload' });
        return;
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.credentials]: {
        username: String(message.username),
        passwordHash: String(message.passwordHash),
        salt: String(message.salt)
      }});
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'verifyCredentials') {
      // message: { username, passwordHash }
      const creds = (await chrome.storage.local.get(STORAGE_KEYS.credentials))[STORAGE_KEYS.credentials];
      const ok = !!(creds && creds.username === message.username && creds.passwordHash === message.passwordHash);
      sendResponse({ ok });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message' });
  })();
  return true;
});


