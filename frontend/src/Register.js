import React, { useState } from "react";
import { api } from "./api";
import "./styles/Login.css";

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [teacherCode, setTeacherCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordIssues = [];
  if (password && password.length < 8) passwordIssues.push("At least 8 characters");
  if (password && !/[a-zA-Z]/.test(password)) passwordIssues.push("At least one letter");
  if (password && !/\d/.test(password)) passwordIssues.push("At least one number");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include at least one letter and one number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.register({
        name,
        email,
        password,
        role,
        teacherCode: role === "teacher" ? teacherCode : undefined,
      });
      onRegister({ token: data.token, ...data.user });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to server. Please try again."
          : err.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="login-logo">📝</div>
          <h2>Create Account</h2>
          <p className="login-subtitle">Join AIMS - Attendance & Quiz System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="input-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        {role === "teacher" && (
          <div className="input-group fade-in">
            <label>Teacher Registration Code</label>
            <input
              type="text"
              placeholder="Enter the teacher code (if required)"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
            />
            <p className="field-hint">
              Ask your administrator for the teacher registration code.
            </p>
          </div>
        )}

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 chars, letters & numbers"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {password.length > 0 && passwordIssues.length > 0 && (
            <div className="password-hints">
              {passwordIssues.map((issue) => (
                <span key={issue} className="password-hint-item">
                  ⚠️ {issue}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>Confirm Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? <span className="spinner"></span> : "Register"}
        </button>

        <p className="switch-text">
          Already have an account?{" "}
          <span className="link" onClick={onSwitchToLogin}>
            Login here
          </span>
        </p>
      </form>
    </div>
  );
}

