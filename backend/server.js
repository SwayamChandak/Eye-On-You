import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables FIRST before importing routes
dotenv.config();

import { router as paymentRoutes } from "./api/routes/payment.js";

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
  })
);

// Serve static files from public directory
app.use(express.static("public"));

// Routes
app.use("/api", paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
