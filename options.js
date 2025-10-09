import { sha256Base64, randomSalt } from "./util_hash.js";

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const emailEl = document.getElementById("email");
const saveBtn = document.getElementById("saveBtn");
const msgEl = document.getElementById("msg");

async function init() {
  const { credentials } = await chrome.storage.local.get("credentials");
  if (credentials?.username) {
    usernameEl.value = credentials.username;
  }
  if (credentials?.email) {
    emailEl.value = credentials.email;
  }
}

saveBtn.addEventListener("click", async () => {
  msgEl.textContent = "";
  msgEl.className = "msg";
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  const email = emailEl.value.trim();

  if (!username || !password) {
    msgEl.textContent = "Username and password are required";
    msgEl.classList.add("err");
    return;
  }

  if (email && !isValidEmail(email)) {
    msgEl.textContent = "Please enter a valid email address";
    msgEl.classList.add("err");
    return;
  }

  // Check if password is being changed
  const { credentials: existingCreds } = await chrome.storage.local.get(
    "credentials"
  );
  const isPasswordChanged =
    existingCreds &&
    existingCreds.username === username &&
    passwordEl.value &&
    existingCreds.passwordHash !==
      (await sha256Base64(password + (existingCreds.salt || "")));

  const salt = randomSalt(16);
  const passwordHash = await sha256Base64(password + salt);
  const res = await chrome.runtime.sendMessage({
    type: "setCredentials",
    username,
    passwordHash,
    salt,
    email,
  });

  if (res?.ok) {
    msgEl.textContent = "Saved.";
    msgEl.classList.add("ok");
    passwordEl.value = "";

    // Send email notification if password was changed and email is provided
    if (isPasswordChanged && email) {
      await chrome.runtime.sendMessage({
        type: "sendEmail",
        event: "password_change",
        email: email,
        username: username,
      });
    }
  } else {
    msgEl.textContent = res?.error || "Failed to save";
    msgEl.classList.add("err");
  }
});

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

init();
