import React, { useState, useEffect, Component } from "react";
import Login from "./Login";
import Register from "./Register";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import { loadSession, saveSession, clearSession, isTokenExpired } from "./api";
import "./App.css";

// Simple error boundary to prevent white-screen crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-container">
          <div className="error-boundary-card">
            <div className="login-logo">⚠️</div>
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. Please refresh the page.</p>
            <button className="login-btn" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const session = loadSession();
    if (session && session.token && session.user) {
      // Check if token is expired
      if (isTokenExpired(session.token)) {
        clearSession();
      } else {
        setUser(session.user);
      }
    }
    setInitializing(false);
  }, []);

  const handleLogin = (userData) => {
    const { token, ...userInfo } = userData;
    const userObj = { ...userInfo, token };
    saveSession(token, userObj);
    setUser(userObj);
  };

  const handleRegister = (userData) => {
    const { token, ...userInfo } = userData;
    const userObj = { ...userInfo, token };
    saveSession(token, userObj);
    setUser(userObj);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setShowRegister(false);
  };
  if (initializing) {
    return (
      <div className="login-container">
        <div className="loading-container">
          <div className="spinner large"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }
  return user.role === "teacher" ? (
    <TeacherDashboard user={user} onLogout={handleLogout} />
  ) : (
    <StudentDashboard user={user} onLogout={handleLogout} />
  );
}
export function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}