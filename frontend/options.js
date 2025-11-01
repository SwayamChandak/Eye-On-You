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
      
      // Print order ID in frontend console
      console.log("✅ Order created successfully!");
      console.log("📋 Order ID:", orderData.id || orderData.orderId);
      console.log("💰 Amount:", orderData.amount, orderData.currency);
      console.log("📝 Full Order Data:", orderData);

      // Open payment page in new tab
      const paymentUrl = `http://localhost:3000/payment.html?orderId=${orderData.id}&amount=${orderData.amount}&currency=${orderData.currency}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`;
      
      // Open payment in new tab
      window.open(paymentUrl, '_blank', 'width=600,height=700');
      
      msgEl.textContent = "Payment window opened. Complete payment in the new tab.";
      msgEl.classList.add("ok");

      // Poll for payment completion (check localStorage or use messaging)
      // For now, just show a message
      // You can implement payment verification later

    } catch (error) {
      console.error("Error:", error);
      msgEl.textContent = "Failed to create order.";
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
