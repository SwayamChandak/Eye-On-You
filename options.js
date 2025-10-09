import { sha256Base64, randomSalt } from './util_hash.js';

const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const saveBtn = document.getElementById('saveBtn');
const msgEl = document.getElementById('msg');

async function init() {
  const { credentials } = await chrome.storage.local.get('credentials');
  if (credentials?.username) {
    usernameEl.value = credentials.username;
  }
}

saveBtn.addEventListener('click', async () => {
  msgEl.textContent = '';
  msgEl.className = 'msg';
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  if (!username || !password) {
    msgEl.textContent = 'Username and password are required';
    msgEl.classList.add('err');
    return;
  }
  const salt = randomSalt(16);
  const passwordHash = await sha256Base64(password + salt);
  const res = await chrome.runtime.sendMessage({ type: 'setCredentials', username, passwordHash, salt });
  if (res?.ok) {
    msgEl.textContent = 'Saved.';
    msgEl.classList.add('ok');
    passwordEl.value = '';
  } else {
    msgEl.textContent = res?.error || 'Failed to save';
    msgEl.classList.add('err');
  }
});

init();


