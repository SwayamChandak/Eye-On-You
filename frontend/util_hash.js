// Hash utility functions for browser extension
// Browser-compatible version (no Node.js dependencies)

/**
 * Generate a random salt string
 * @param {number} length - Length of the salt
 * @returns {string} Random salt string
 */
export function randomSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * SHA-256 hash function that returns base64
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Base64 encoded hash
 */
export async function sha256Base64(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  // Convert hex to base64
  return btoa(
    hashHex
      .match(/\w{2}/g)
      .map((byte) => String.fromCharCode(parseInt(byte, 16)))
      .join("")
  );
}
