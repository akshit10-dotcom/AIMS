const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sanitize = require("./middleware/sanitize");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const quizRoutes = require("./routes/quiz");
const lectureRoutes = require("./routes/lecture");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ============ SECURITY ============

if (process.env.NODE_ENV === "production") {
  const missingConfig = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    missingConfig.push("JWT_SECRET (at least 32 characters)");
  }
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    missingConfig.push("MONGO_URI");
  }
  const configuredClientOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!configuredClientOrigins.length && !process.env.RENDER_EXTERNAL_URL) {
    missingConfig.push("CLIENT_ORIGIN");
  }
  if (
    !process.env.TEACHER_REGISTRATION_CODE ||
    !process.env.TEACHER_REGISTRATION_CODE.trim()
  ) {
    missingConfig.push("TEACHER_REGISTRATION_CODE");
  }

  if (missingConfig.length) {
    console.error(`FATAL: Set valid production environment variables: ${missingConfig.join(", ")}.`);
    process.exit(1);
  }
}

// Trust proxy - required when behind a reverse proxy (e.g. nginx, Render, Heroku)
app.set("trust proxy", 1);

// Hide Express-powered-by header
app.disable("x-powered-by");

// HTTP security headers
app.use(helmet());

// CORS - restrict production to configured frontend origins and this Render service.
const developmentOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:3000",
        "http://localhost:5000",
        "capacitor://localhost",
        "https://localhost",
      ];
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || "").split(","),
  process.env.RENDER_EXTERNAL_URL || "",
  ...developmentOrigins,
]
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parsing with size limit (prevent huge payloads)
// 100kb is enough for bulk attendance (500 records) while blocking abuse
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Prevent MongoDB query injection ($ operators) - custom Express 5 compatible
app.use(sanitize);

// ============ RATE LIMITING ============

// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/", generalLimiter);

// Stricter limiter for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/register attempts. Please try again later." },
});
app.use("/auth", authLimiter);

// ============ DATABASE ============

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/schoolApp";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// ============ ROUTES ============

app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/quiz", quizRoutes);
app.use("/lecture", lectureRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "frontend", "build")));
}

// Health check
app.get("/", (req, res) => {
  res.json({ message: "AIMS API is running", status: "ok", uptime: process.uptime() });
});

app.get("/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

// ============ ERROR HANDLING ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ SERVER START ============

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`)
);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed. Exiting.");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed. Exiting.");
      process.exit(0);
    });
  });
});

