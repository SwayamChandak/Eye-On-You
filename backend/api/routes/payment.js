import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = express.Router();

// https://razorpay.com/docs/payments/server-integration/python/integration-steps/#integrate-with-razorpay-payment-gateway

// curl -u [YOUR_KEY_ID]:[YOUR_KEY_SECRET] \
// -X POST https://api.razorpay.com/v1/orders \
// -H "content-type: application/json" \
// -d '{
//   "amount": 5000,
//   "currency": "<currency>",
//   "receipt": "receipt#1",
//   "notes": {
//     "key1": "value3",
//     "key2": "value2"
//   }
// }'

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
router.post("/create-order", async (req, res) => {
  console.log("🚀 ~ create-order:", create-order)
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

    // Create order using Razorpay SDK
    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      id: order.id,
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
