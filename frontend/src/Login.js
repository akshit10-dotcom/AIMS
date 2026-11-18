import React, { useState } from "react";
import { api } from "./api";
import "./styles/Login.css";

export default function Login({ onLogin, onSwitchToRegister }) {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login({ email, password, role });
      onLogin({ token: data.token, ...data.user, role });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to server. Please try again."
          : err.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">📚</div>
          <h2>{role === "teacher" ? "Teacher Login" : "Student Login"}</h2>
          <p className="login-subtitle">AIMS - Attendance & Quiz System</p>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <div className="input-group">
          <label htmlFor="login-role">Role</label>
          <select id="login-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="login-password">Password</label>
          <div className="password-wrapper">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
        </div>

        <button type="submit" className="login-btn" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span>Logging in...</span>
            </>
          ) : "Login"}
        </button>

        <p className="switch-text">
          Don't have an account?{" "}
          <button type="button" className="link" onClick={onSwitchToRegister}>
            Register here
          </button>
        </p>
      </form>
    </div>
  );
}

