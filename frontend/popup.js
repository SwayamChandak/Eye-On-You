import { sha256Base64 } from "../backend/util_hash.js";

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

  const websiteData = res.websiteData || {};
  const entries = Object.entries(websiteData)
    .filter(([_, data]) => data.time > 0)
    .sort((a, b) => b[1].time - a[1].time);

  for (const [host, data] of entries) {
    const tr = document.createElement("tr");

    // Website name and favicon cell
    const td1 = document.createElement("td");
    td1.className = "website-cell";

    // Create favicon image
    const favicon = document.createElement("img");
    favicon.src =
      data.favicon ||
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><rect width='16' height='16' fill='%23666'/><text x='8' y='12' text-anchor='middle' fill='white' font-size='10' font-family='Arial'>?</text></svg>";
    favicon.className = "website-favicon";
    favicon.onerror = function () {
      this.src =
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><rect width='16' height='16' fill='%23666'/><text x='8' y='12' text-anchor='middle' fill='white' font-size='10' font-family='Arial'>?</text></svg>";
    };

    // Create website name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = data.name || host;
    nameSpan.className = "website-name";

    td1.appendChild(favicon);
    td1.appendChild(nameSpan);

    // Time cell
    const td2 = document.createElement("td");
    td2.textContent = formatDuration(data.time);
    td2.style.fontFamily = "monospace";
    td2.style.fontSize = "12px";

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
  // Clear username and password fields after successful action
  usernameEl.value = "";
  passwordEl.value = "";
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
