import express from "express";
import crypto from "crypto";
// import fetch from "node-fetch";

const router = express.Router();

// Create Order
router.post("/create-order", async (req, res) => {
  console.log("🚀 ~ create-order endpoint called");
  try {
    const {
      amount,
      currency = "INR",
      receipt = "receipt#1",
      notes = {},
    } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be greater than 0",
      });
    }

    // Prepare request to Razorpay API
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt,
      notes: {
        ...notes,
        user_id: req.body.user_id || "anonymous",
        timestamp: new Date().toISOString(),
      },
    };

    // Make request to Razorpay's orders API
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET
          ).toString("base64"),
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error("Failed to create Razorpay order");
    }

    const order = await response.json();

    // Print order ID in backend console
    console.log("✅ Order created successfully!");
    console.log("📋 Order ID:", order.id);
    console.log("💰 Amount:", order.amount / 100, order.currency);
    console.log("📝 Receipt:", order.receipt);

    res.json({
      success: true,
      id: order.id,
      orderId: order.id, // Explicitly return orderId for frontend
      entity: order.entity,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      created_at: order.created_at,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Verify Payment
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.json({
        success: true,
        message: "Payment verified successfully",
        payment_id: razorpay_payment_id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router };
