import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import { api } from "./api";
import "./styles/Dashboard.css";

export default function StudentDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState({});
  const [error, setError] = useState("");

  // Attendance
  const [attendanceInfo, setAttendanceInfo] = useState(null);

  // Lectures
  const [lectures, setLectures] = useState([]);

  // Quizzes
  const [quizzes, setQuizzes] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedQuizzes, setSubmittedQuizzes] = useState(new Set());

  // Results
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Welcome date
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchAttendance = useCallback(async () => {
    try {
      const data = await api.getAttendancePercentage(user.id, user.token);
      setAttendanceInfo(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch attendance data.");
    }
  }, [user.id, user.token]);

  const fetchLectures = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const data = await api.getLectures(todayStr, user.token);
      setLectures(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch lectures.");
    }
  }, [user.token]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await api.getQuizzes(user.token);
      setQuizzes(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch quizzes.");
    }
  }, [user.token]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const data = await api.getQuizResults(user.id, user.token);
      setResults(data);
      const submitted = new Set(data.map((s) => s.quizId?._id).filter(Boolean));
      setSubmittedQuizzes(submitted);
      setError("");
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setResultsLoading(false);
    }
  }, [user.id, user.token]);

  useEffect(() => {
    fetchAttendance();
    fetchLectures();
    fetchQuizzes();
    fetchResults();
  }, [fetchAttendance, fetchLectures, fetchQuizzes, fetchResults]);

  const submitAnswer = async (quizId) => {
    const selectedAnswer = selectedAnswers[quizId];
    if (!selectedAnswer) {
      alert("Please select an answer first!");
      return;
    }

    setLoading((prev) => ({ ...prev, [quizId]: true }));

    try {
      const data = await api.submitQuiz(
        {
          quizId,
          selectedAnswer,
        },
        user.token
      );
      setSubmittedQuizzes((prev) => new Set([...prev, quizId]));
      alert(data.isCorrect ? "✅ Correct Answer!" : "❌ Wrong Answer!");
      fetchResults();
    } catch (err) {
      alert(err.message || "Failed to submit answer");
    } finally {
      setLoading((prev) => ({ ...prev, [quizId]: false }));
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="section fade-in">
            <div className="welcome-header">
              <div>
                <h2>Welcome, {user.name}! 👋</h2>
                <p className="welcome-date">{today}</p>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <h3>Attendance</h3>
                <p className="stat-value">
                  {attendanceInfo ? `${attendanceInfo.percentage}%` : "---"}
                </p>
                {attendanceInfo && (
                  <span
                    className={
                      attendanceInfo.meetsRequirement
                        ? "stat-status good"
                        : "stat-status bad"
                    }
                  >
                    {attendanceInfo.meetsRequirement ? "✅ Meets 75%" : "⚠️ Below 75%"}
                  </span>
                )}
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <h3>Today's Lectures</h3>
                <p className="stat-value">{lectures.length}</p>
                <p className="stat-sub">scheduled today</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <h3>Available Quizzes</h3>
                <p className="stat-value">{quizzes.length}</p>
                <p className="stat-sub">quiz questions</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <h3>Quiz Score</h3>
                <p className="stat-value">
                  {results.length > 0
                    ? `${results.filter((r) => r.isCorrect).length}/${results.length}`
                    : "---"}
                </p>
                <p className="stat-sub">correct answers</p>
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}
          </div>
        );

      case "attendance":
        return (
          <div className="section fade-in">
            <h2>✅ My Attendance</h2>
            <div className="attendance-card">
              {attendanceInfo ? (
                <div className="attendance-details">
                  <div className="attendance-circle">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${attendanceInfo.percentage}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="percentage">
                        {attendanceInfo.percentage}%
                      </text>
                    </svg>
                  </div>
                  <div className="attendance-stats">
                    <p>
                      <strong>Classes Attended:</strong> {attendanceInfo.attended} /{" "}
                      {attendanceInfo.totalClasses}
                    </p>
                    <p>
                      <strong>Attendance Percentage:</strong>{" "}
                      {attendanceInfo.percentage}%
                    </p>
                    <p>
                      <strong>Minimum Required:</strong> {attendanceInfo.threshold}%
                    </p>
                    <p
                      className={
                        attendanceInfo.meetsRequirement
                          ? "text-success"
                          : "text-danger"
                      }
                    >
                      {attendanceInfo.meetsRequirement
                        ? "✅ You meet the minimum attendance requirement!"
                        : "⚠️ Your attendance is below the minimum requirement!"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="loading-container">
                  <p>No attendance records yet</p>
                </div>
              )}
            </div>
          </div>
        );

      case "quizzes":
        return (
          <div className="section fade-in">
            <h2>📝 Take Quizzes</h2>
            {quizzes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No Quizzes Available</h3>
                <p>Your teacher hasn't added any quizzes yet. Check back later!</p>
              </div>
            ) : (
              <div className="quiz-grid">
                {quizzes.map((quiz) => {
                  const isSubmitted = submittedQuizzes.has(quiz._id);
                  return (
                    <div
                      key={quiz._id}
                      className={`quiz-card ${isSubmitted ? "submitted" : ""}`}
                    >
                      <p className="quiz-question">{quiz.question}</p>
                      <div className="quiz-options">
                        {quiz.options.map((opt) => (
                          <label
                            key={opt}
                            className={`option-label ${
                              selectedAnswers[quiz._id] === opt ? "selected" : ""
                            } ${isSubmitted ? "disabled" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`quiz-${quiz._id}`}
                              value={opt}
                              checked={selectedAnswers[quiz._id] === opt}
                              onChange={() =>
                                setSelectedAnswers({
                                  ...selectedAnswers,
                                  [quiz._id]: opt,
                                })
                              }
                              disabled={isSubmitted}
                            />
                            <span className="option-text">{opt}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`btn ${
                          isSubmitted ? "btn-success" : "btn-primary"
                        }`}
                        onClick={() => submitAnswer(quiz._id)}
                        disabled={isSubmitted || loading[quiz._id]}
                      >
                        {loading[quiz._id] ? (
                          <span className="spinner"></span>
                        ) : isSubmitted ? (
                          "✅ Submitted"
                        ) : (
                          "Submit Answer"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "lectures":
        return (
          <div className="section fade-in">
            <h2>📅 Today's Lectures</h2>
            {lectures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No Lectures Today</h3>
                <p>There are no lectures scheduled for today. Enjoy your day!</p>
              </div>
            ) : (
              <div className="lecture-list">
                {lectures.map((lec) => (
                  <div key={lec._id} className="lecture-card">
                    <div className="lecture-header">
                      <div className="lecture-icon">📖</div>
                      <div className="lecture-info">
                        <h3>{lec.subject}</h3>
                        <p className="lecture-teacher">by {lec.teacher}</p>
                      </div>
                    </div>
                    <div className="lecture-time">
                      <div className="time-badge">
                        <span>🕐</span>
                        <span>
                          {lec.startTime} - {lec.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "results":
        return (
          <div className="section fade-in">
            <h2>📈 My Quiz Results</h2>
            {resultsLoading ? (
              <div className="loading-container">
                <div className="spinner large"></div>
                <p>Loading results...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Results Yet</h3>
                <p>Take some quizzes to see your results here!</p>
              </div>
            ) : (
              <div className="results-summary">
                <div className="summary-card">
                  <div className="summary-icon">🏆</div>
                  <div className="summary-info">
                    <h3>Your Score</h3>
                    <p className="summary-value">
                      {results.filter((r) => r.isCorrect).length} / {results.length}
                    </p>
                    <p className="summary-label">
                      ({((results.filter((r) => r.isCorrect).length / results.length) * 100).toFixed(1)}
                      %)
                    </p>
                  </div>
                </div>
                <div className="table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Your Answer</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((sub, idx) => (
                        <tr key={idx}>
                          <td>{sub.quizId?.question || "Deleted Quiz"}</td>
                          <td>{sub.selectedAnswer}</td>
                          <td>
                            <span
                              className={
                                sub.isCorrect ? "badge-success" : "badge-danger"
                              }
                            >
                              {sub.isCorrect ? "✅ Correct" : "❌ Wrong"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
      />
      <main className="main-content">
        <div className="dashboard-container">{renderContent()}</div>
      </main>
    </div>
  );
}

