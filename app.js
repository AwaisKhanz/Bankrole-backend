const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const bankrollRoutes = require("./src/routes/bankrollRoutes");
const betRoutes = require("./src/routes/betRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();

app.use(
  "/api/stripe/webhook",
  bodyParser.raw({
    type: "application/json",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // Capture raw body
    },
  })
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bankrolls", bankrollRoutes);
app.use("/api/bets", betRoutes);

app.use("/api/stripe", paymentRoutes);

// Global Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message || "Something went wrong",
    });
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error. Please try again later.",
  });
});

module.exports = app;
