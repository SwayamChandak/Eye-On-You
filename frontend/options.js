import { sha256Base64, randomSalt } from "../backend/util_hash.js";
import { initiatePayment } from "./payment_handler.js";

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

  if (isPasswordChanged) {
    try {
      // Call localhost API to create order
      const response = await fetch("http://localhost:3000/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 1,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          notes: {
            purpose: "password_change",
            username: username,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await response.json();
      console.log("Order created:", orderData);

      // Change username and password
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
        msgEl.textContent = "Order created and credentials saved.";
        msgEl.classList.add("ok");
        passwordEl.value = "";
      } else {
        msgEl.textContent = res?.error || "Failed to save credentials";
        msgEl.classList.add("err");
      }
    } catch (error) {
      console.error("Error:", error);
      msgEl.textContent = "Failed to create order or save credentials.";
      msgEl.classList.add("err");
      return;
    }
  } else {
    // No password change, just save credentials normally
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
    } else {
      msgEl.textContent = res?.error || "Failed to save";
      msgEl.classList.add("err");
    }
  }
});

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

init();
