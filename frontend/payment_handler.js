// Constants
const BACKEND_URL = "http://localhost:3000"; // When testing locally
const RAZORPAY_KEY_ID = "rzp_test_RZfOfg4ZK6qdnl";

export async function initiatePayment(amount, purpose) {
  try {
    // Create order
    const orderResponse = await fetch(`${BACKEND_URL}/api/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        notes: {
          purpose,
        },
      }),
    });

    if (!orderResponse.ok) {
      throw new Error("Failed to create order");
    }

    const orderData = await orderResponse.json();

    // Initialize Razorpay
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Eye-On-You",
      description: `Payment for ${purpose}`,
      order_id: orderData.id,
      handler: async function (response) {
        // Verify payment
        const verifyResponse = await fetch(
          `${BACKEND_URL}/api/verify-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          }
        );

        if (!verifyResponse.ok) {
          throw new Error("Payment verification failed");
        }

        return await verifyResponse.json();
      },
      theme: {
        color: "#6aa3ff",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();

    return new Promise((resolve) => {
      rzp.on("payment.success", resolve);
    });
  } catch (error) {
    console.error("Payment error:", error);
    throw error;
  }
}
