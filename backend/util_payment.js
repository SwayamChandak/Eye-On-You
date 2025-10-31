// Razorpay integration utility

const RAZORPAY_KEY_ID = "YOUR_KEY_ID"; // Replace with your actual key ID

// Initialize Razorpay checkout
export function initializeRazorpayCheckout({
  amount,
  currency = "INR",
  name = "Eye On You",
  description = "Premium Subscription",
  theme = { color: "#3399cc" },
}) {
  return new Promise((resolve, reject) => {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // Razorpay expects amount in smallest currency unit (paise)
      currency,
      name,
      description,
      theme,
      handler: function (response) {
        // Handle successful payment
        resolve({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled by user"));
        },
      },
      prefill: {
        // You can prefill user details if available
        email: "",
        contact: "",
      },
    };

    try {
      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      reject(error);
    }
  });
}

// Verify payment on your backend
export async function verifyPayment(paymentData) {
  // You'll need a backend API to verify the payment using Razorpay's webhook
  // This is crucial for security - never skip payment verification
  try {
    const response = await fetch("YOUR_BACKEND_VERIFICATION_URL", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
    return await response.json();
  } catch (error) {
    console.error("Payment verification failed:", error);
    throw error;
  }
}
