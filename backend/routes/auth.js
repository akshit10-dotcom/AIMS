const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isStrongPassword, isValidEmail, isValidName } = require("../middleware/validate");

const router = express.Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Generate JWT for a user
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// @route   POST /auth/register
// @desc    Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, teacherCode } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate name
    if (!isValidName(name)) {
      return res.status(400).json({
        error: "Name must be 2-50 characters and contain only letters, spaces, hyphens, or apostrophes",
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and include at least one letter and one number",
      });
    }

    // Validate role
    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Role must be teacher or student" });
    }

    // Teacher registration requires a code (if configured)
    if (role === "teacher") {
      const requiredCode = process.env.TEACHER_REGISTRATION_CODE;
      if (requiredCode && teacherCode !== requiredCode) {
        return res.status(403).json({
          error: "Invalid teacher registration code",
        });
      }
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "User with this email already exists" });
    }
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role are required" });
    }

    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Find user (password is excluded by default, so explicitly select it)
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role,
    }).select("+password");

    // Use a generic error message to prevent user enumeration
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

module.exports = router;

