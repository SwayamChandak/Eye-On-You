Time Counter (MV3)

Track how long you spend on each website (per domain). Tracking can be disabled/enabled only with the correct username and password.

Features
- Background service worker tracks active tab domain every second
- Ignores time when computer is idle or window minimized
- Popup shows per-domain totals; clear/reset and refresh
- Options page to set username and password (stored as salted SHA-256 hash)
- Lock/Unlock tracking from popup with authentication

Install (Chrome/Edge/Brave)
1. Download this folder to your computer.
2. Open browser to `chrome://extensions` (or equivalent).
3. Enable "Developer mode".
4. Click "Load unpacked" and select the folder.

Usage
- Click the extension icon to open the popup and view time by domain.
- Open Options (right-click the icon → Options) to set credentials.
- In the popup, enter credentials to Lock (disable) or Unlock (enable) tracking.

Notes
- Time is stored locally in `chrome.storage.local`.
- Password is never stored in plaintext; only salted hash is stored.
- This is not tamper-proof; anyone with file access to the extension folder can remove it or the storage. It's intended to prevent casual disabling from the UI.

Privacy
No data leaves your device. There is no network access.


