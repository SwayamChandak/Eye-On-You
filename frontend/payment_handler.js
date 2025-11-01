// Payment handler for browser extension
// This file is kept for future use but payment logic is now handled via backend API

const BACKEND_URL = "http://localhost:3000";

/**
 * Create a payment order via backend API
 * @param {number} amount - Amount in INR
 * @param {string} purpose - Purpose of payment
 * @param {object} notes - Additional notes
 * @returns {Promise<object>} Order data
 */
export async function createPaymentOrder(amount, purpose, notes = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          purpose,
          ...notes,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create order");
    }

    return await response.json();
  } catch (error) {
    console.error("Payment order creation error:", error);
    throw error;
  }
}

/**
 * Verify a payment via backend API
 * @param {object} paymentData - Payment verification data
 * @returns {Promise<object>} Verification result
 */
export async function verifyPayment(paymentData) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Payment verification failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
}
