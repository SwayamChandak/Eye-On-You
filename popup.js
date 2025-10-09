import { sha256Base64 } from "./util_hash.js";

const trackingStateEl = document.getElementById("trackingState");
const tableBodyEl = document.querySelector("#statsTable tbody");
const refreshBtn = document.getElementById("refreshBtn");
const clearBtn = document.getElementById("clearBtn");
const lockBtn = document.getElementById("lockBtn");
const unlockBtn = document.getElementById("unlockBtn");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const authMsgEl = document.getElementById("authMsg");

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

async function loadStats() {
  const res = await chrome.runtime.sendMessage({ type: "getStats" });
  trackingStateEl.textContent = res.isTrackingEnabled ? "Enabled" : "Disabled";
  tableBodyEl.innerHTML = "";
  const entries = Object.entries(res.timeByHost || {}).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [host, seconds] of entries) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.textContent = host;
    td2.textContent = formatDuration(seconds);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tableBodyEl.appendChild(tr);
  }
}

refreshBtn.addEventListener("click", loadStats);
clearBtn.addEventListener("click", () =>
  tryAuthAnd(async () => {
    const { credentials } = await chrome.storage.local.get("credentials");
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    const hash = await sha256Base64(password + credentials.salt);
    const res = await chrome.runtime.sendMessage({
      type: "clearStats",
      username,
      passwordHash: hash,
    });
    if (!res?.ok) {
      authMsgEl.textContent = res?.error || "Failed to clear";
    }
    // Email notification is handled in background.js after successful clear
  })
);

async function tryAuthAnd(action) {
  authMsgEl.textContent = "";
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  if (!username || !password) {
    authMsgEl.textContent = "Enter username and password.";
    return;
  }
  // Fetch salt
  const credsSet = await chrome.runtime.sendMessage({
    type: "getCredentialsSet",
  });
  if (!credsSet.set) {
    authMsgEl.textContent = "Set credentials in Options.";
    return;
  }
  // We need the salt from storage directly to build the hash
  const { credentials } = await chrome.storage.local.get("credentials");
  const hash = await sha256Base64(password + credentials.salt);
  const verify = await chrome.runtime.sendMessage({
    type: "verifyCredentials",
    username,
    passwordHash: hash,
  });
  if (!verify.ok) {
    authMsgEl.textContent = "Invalid credentials";
    return;
  }
  await action();
  await loadStats();
}

lockBtn.addEventListener("click", () =>
  tryAuthAnd(async () => {
    await chrome.runtime.sendMessage({
      type: "setTrackingEnabled",
      enabled: false,
    });
  })
);

unlockBtn.addEventListener("click", () =>
  tryAuthAnd(async () => {
    await chrome.runtime.sendMessage({
      type: "setTrackingEnabled",
      enabled: true,
    });
  })
);

loadStats();
