import React from "react";
import "./styles/Sidebar.css";

export default function Sidebar({ user, activeSection, onSectionChange, onLogout }) {
  const teacherSections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "quizzes", label: "Manage Quizzes", icon: "📝" },
    { id: "lectures", label: "Manage Lectures", icon: "📅" },
    { id: "attendance", label: "Mark Attendance", icon: "✅" },
    { id: "results", label: "View Results", icon: "📈" },
  ];

  const studentSections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "My Attendance", icon: "✅" },
    { id: "quizzes", label: "Take Quizzes", icon: "📝" },
    { id: "lectures", label: "Today's Lectures", icon: "📅" },
    { id: "results", label: "My Results", icon: "📈" },
  ];

  const sections = user.role === "teacher" ? teacherSections : studentSections;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">📚</div>
        <h3>AIMS</h3>
        <p className="sidebar-role">{user.role}</p>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="user-info">
          <p className="user-name">{user.name || "User"}</p>
          <p className="user-email">{user.email}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`nav-item ${activeSection === section.id ? "active" : ""}`}
            onClick={() => onSectionChange(section.id)}
          >
            <span className="nav-icon">{section.icon}</span>
            <span className="nav-label">{section.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="logout-btn" onClick={onLogout}>
          <span className="nav-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

