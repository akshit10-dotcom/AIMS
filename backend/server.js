const express = require("express");
const mongoose = require("mongoose");
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

// Fail fast in production if critical secrets are missing
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be set in production.");
  process.exit(1);
}

// Trust proxy - required when behind a reverse proxy (e.g. nginx, Render, Heroku)
app.set("trust proxy", 1);

// Hide Express-powered-by header
app.disable("x-powered-by");

// HTTP security headers
app.use(helmet());

// CORS - restricted to configured origins
// Defaults include web dev and Capacitor Android origins
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  "http://localhost:3000,http://localhost:5000,capacitor://localhost,https://localhost"
)
  .split(",")
  .map((o) => o.trim())
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

// Health check
app.get("/", (req, res) => {
  res.json({ message: "AIMS API is running", status: "ok", uptime: process.uptime() });
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

