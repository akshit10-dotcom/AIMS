import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import { api } from "./api";
import "./styles/Dashboard.css";

export default function TeacherDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState({});

  // ---- Manual Quiz ----
  const [quiz, setQuiz] = useState({ question: "", optionsText: "", answer: "" });
  const [quizMessage, setQuizMessage] = useState("");

  // ---- AI Quiz ----
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(3);
  const [aiMessage, setAiMessage] = useState("");

  // ---- Quiz List (existing quizzes) ----
  const [quizList, setQuizList] = useState([]);
  const [quizListLoading, setQuizListLoading] = useState(false);

  // ---- Lecture ----
  const [lecture, setLecture] = useState({
    subject: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [lectureMessage, setLectureMessage] = useState("");

  // ---- Lecture List ----
  const [lectureList, setLectureList] = useState([]);
  const [lectureDate, setLectureDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lectureListLoading, setLectureListLoading] = useState(false);

  // ---- Attendance ----
  const [studentsList, setStudentsList] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);

  // ---- Results ----
  const [allResults, setAllResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // ---- Welcome date ----
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // --- Manual Quiz ---
  const createQuiz = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, quiz: true }));
    setQuizMessage("");

    try {
      const options = quiz.optionsText
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        setQuizMessage("❌ Please provide at least 2 options separated by commas.");
        setLoading((prev) => ({ ...prev, quiz: false }));
        return;
      }

      const data = await api.createQuiz(
        {
          question: quiz.question,
          options,
          answer: quiz.answer,
        },
        user.token
      );
      setQuizMessage(`✅ ${data.message}`);
      setQuiz({ question: "", optionsText: "", answer: "" });
      fetchQuizList();
    } catch (err) {
      setQuizMessage(`❌ ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, quiz: false }));
    }
  };

  // --- AI Quiz Generation ---
  const generateAiQuiz = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, ai: true }));
    setAiMessage("");

    try {
      const data = await api.generateAiQuiz(
        { topic: aiTopic, count: aiCount },
        user.token
      );
      setAiMessage(`✅ ${data.message}`);
      setAiTopic("");
      setAiCount(3);
      fetchQuizList();
    } catch (err) {
      setAiMessage(`❌ ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, ai: false }));
    }
  };

  // --- Delete Quiz ---
  const deleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz? Student submissions will also be removed.")) {
      return;
    }
    setLoading((prev) => ({ ...prev, [`deleteQuiz-${quizId}`]: true }));
    try {
      await api.deleteQuiz(quizId, user.token);
      setQuizList((prev) => prev.filter((q) => q._id !== quizId));
    } catch (err) {
      alert(`Failed to delete quiz: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`deleteQuiz-${quizId}`]: false }));
    }
  };

  // --- Add Lecture ---
  const addLecture = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, lecture: true }));
    setLectureMessage("");

    try {
      const data = await api.addLecture(lecture, user.token);
      setLectureMessage(`✅ ${data.message}`);
      setLecture({ subject: "", date: "", startTime: "", endTime: "" });
      // Refresh list for the date being added
      setLectureDate(lecture.date);
      fetchLectureList(lecture.date);
    } catch (err) {
      setLectureMessage(`❌ ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, lecture: false }));
    }
  };

  // --- Delete Lecture ---
  const deleteLecture = async (lectureId) => {
    if (!window.confirm("Delete this lecture?")) return;
    setLoading((prev) => ({ ...prev, [`deleteLecture-${lectureId}`]: true }));
    try {
      await api.deleteLecture(lectureId, user.token);
      setLectureList((prev) => prev.filter((l) => l._id !== lectureId));
    } catch (err) {
      alert(`Failed to delete lecture: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`deleteLecture-${lectureId}`]: false }));
    }
  };

  // --- Bulk Mark Attendance ---
  const bulkMarkAttendance = async () => {
    setLoading((prev) => ({ ...prev, attendance: true }));
    setAttendanceMessage("");

    try {
      const records = studentsList
        .filter((s) => s.status !== "Unmarked")
        .map((s) => ({
          studentId: s._id,
          status: s.status,
        }));

      if (records.length === 0) {
        setAttendanceMessage("❌ No changes made. Mark at least one student.");
        setLoading((prev) => ({ ...prev, attendance: false }));
        return;
      }

      const data = await api.bulkMarkAttendance(
        { records, date: attendanceDate },
        user.token
      );
      setAttendanceMessage(`✅ ${data.message}`);
      fetchStudentsList();
    } catch (err) {
      setAttendanceMessage(`❌ ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, attendance: false }));
    }
  };

  const fetchStudentsList = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await api.getStudentsList(attendanceDate, user.token);
      setStudentsList(data.students);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setStudentsLoading(false);
    }
  }, [attendanceDate, user.token]);

  const fetchQuizList = useCallback(async () => {
    setQuizListLoading(true);
    try {
      const data = await api.getQuizzes(user.token);
      setQuizList(data);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    } finally {
      setQuizListLoading(false);
    }
  }, [user.token]);

  const fetchLectureList = useCallback(
    async (date = lectureDate) => {
      setLectureListLoading(true);
      try {
        const data = await api.getLectures(date, user.token);
        setLectureList(data);
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
      } finally {
        setLectureListLoading(false);
      }
    },
    [lectureDate, user.token]
  );

  // --- Results ---
  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const data = await api.getAllQuizResults(user.token);
      setAllResults(data);
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setResultsLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    if (activeSection === "results") fetchResults();
    if (activeSection === "attendance") fetchStudentsList();
    if (activeSection === "quizzes") fetchQuizList();
    if (activeSection === "lectures") fetchLectureList();
  }, [activeSection, fetchStudentsList, fetchResults, fetchQuizList, fetchLectureList]);

  const updateStudentStatus = (studentId, newStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => (s._id === studentId ? { ...s, status: newStatus } : s))
    );
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
                <div className="stat-icon">📝</div>
                <h3>Create Quizzes</h3>
                <p>Manual or AI-powered quiz generation</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🤖</div>
                <h3>AI Quiz Generator</h3>
                <p>Auto-generate quizzes from any topic</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <h3>Manage Lectures</h3>
                <p>Schedule and organize lectures</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <h3>Mark Attendance</h3>
                <p>See all students and mark Present/Absent/Exempt</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <h3>View Results</h3>
                <p>See student quiz performance</p>
              </div>
            </div>
          </div>
        );

      case "quizzes":
        return (
          <div className="section fade-in">
            <h2>📝 Create Quiz (Manual)</h2>
            <form onSubmit={createQuiz} className="form-card">
              <div className="form-group">
                <label>Question</label>
                <input
                  placeholder="Enter the quiz question"
                  value={quiz.question}
                  onChange={(e) => setQuiz({ ...quiz, question: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Options (comma separated)</label>
                <input
                  placeholder="e.g. Paris, London, Berlin, Madrid"
                  value={quiz.optionsText}
                  onChange={(e) => setQuiz({ ...quiz, optionsText: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Correct Answer</label>
                <input
                  placeholder="Enter the correct answer"
                  value={quiz.answer}
                  onChange={(e) => setQuiz({ ...quiz, answer: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading.quiz}>
                {loading.quiz ? <span className="spinner"></span> : "Create Quiz"}
              </button>
              {quizMessage && (
                <p className={quizMessage.includes("✅") ? "success-msg" : "error-msg"}>
                  {quizMessage}
                </p>
              )}
            </form>

            <h2 style={{ marginTop: "2.5rem" }}>🤖 AI Quiz Generator</h2>
            <form onSubmit={generateAiQuiz} className="form-card">
              <div className="form-group">
                <label>Topic</label>
                <input
                  placeholder="e.g. Photosynthesis, World War II, Algebra"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value) || 3)}
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={loading.ai}>
                {loading.ai ? <span className="spinner"></span> : "🤖 Generate with AI"}
              </button>
              {!process.env.REACT_APP_GEMINI_API_KEY && (
                <p className="info-msg">
                  ℹ️ Using template-based generation. Add GEMINI_API_KEY to the backend .env for AI-powered generation.
                </p>
              )}
              {aiMessage && (
                <p className={aiMessage.includes("✅") ? "success-msg" : "error-msg"}>
                  {aiMessage}
                </p>
              )}
            </form>

            <h2 style={{ marginTop: "2.5rem" }}>📚 Published Quizzes</h2>
            {quizListLoading ? (
              <div className="loading-container">
                <div className="spinner large"></div>
                <p>Loading quizzes...</p>
              </div>
            ) : quizList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No Quizzes Yet</h3>
                <p>Create a quiz above or use the AI generator to publish questions.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Options</th>
                      <th style={{ width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizList.map((q) => (
                      <tr key={q._id}>
                        <td>{q.question}</td>
                        <td>
                          <div className="option-tags">
                            {q.options.map((opt) => (
                              <span key={opt} className="option-tag">
                                {opt}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger-outline"
                            onClick={() => deleteQuiz(q._id)}
                            disabled={loading[`deleteQuiz-${q._id}`]}
                          >
                            {loading[`deleteQuiz-${q._id}`] ? (
                              <span className="spinner"></span>
                            ) : (
                              "🗑️ Delete"
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "lectures":
        return (
          <div className="section fade-in">
            <h2>📅 Add Lecture</h2>
            <form onSubmit={addLecture} className="form-card">
              <div className="form-group">
                <label>Subject</label>
                <input
                  placeholder="e.g. Mathematics"
                  value={lecture.subject}
                  onChange={(e) => setLecture({ ...lecture, subject: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={lecture.date}
                  onChange={(e) => setLecture({ ...lecture, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={lecture.startTime}
                    onChange={(e) => setLecture({ ...lecture, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={lecture.endTime}
                    onChange={(e) => setLecture({ ...lecture, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading.lecture}>
                {loading.lecture ? <span className="spinner"></span> : "Add Lecture"}
              </button>
              {lectureMessage && (
                <p className={lectureMessage.includes("✅") ? "success-msg" : "error-msg"}>
                  {lectureMessage}
                </p>
              )}
            </form>

            <h2 style={{ marginTop: "2.5rem" }}>📚 Scheduled Lectures</h2>
            <div className="form-card" style={{ marginBottom: "1.5rem" }}>
              <div className="form-row">
                <div className="form-group">
                  <label>View Date</label>
                  <input
                    type="date"
                    value={lectureDate}
                    onChange={(e) => {
                      setLectureDate(e.target.value);
                      fetchLectureList(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>

            {lectureListLoading ? (
              <div className="loading-container">
                <div className="spinner large"></div>
                <p>Loading lectures...</p>
              </div>
            ) : lectureList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No Lectures on this Date</h3>
                <p>Add a lecture above to schedule it for {lectureDate}.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Time</th>
                      <th>Teacher</th>
                      <th style={{ width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectureList.map((lec) => (
                      <tr key={lec._id}>
                        <td>
                          <strong>{lec.subject}</strong>
                        </td>
                        <td>
                          {lec.startTime} - {lec.endTime}
                        </td>
                        <td>{lec.teacher}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger-outline"
                            onClick={() => deleteLecture(lec._id)}
                            disabled={loading[`deleteLecture-${lec._id}`]}
                          >
                            {loading[`deleteLecture-${lec._id}`] ? (
                              <span className="spinner"></span>
                            ) : (
                              "🗑️"
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "attendance":
        return (
          <div className="section fade-in">
            <h2>✅ Mark Attendance</h2>
            <div className="form-card" style={{ marginBottom: "1.5rem" }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Select Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={fetchStudentsList}
                    disabled={studentsLoading}
                  >
                    {studentsLoading ? <span className="spinner"></span> : "🔄 Refresh"}
                  </button>
                </div>
              </div>
            </div>

            {studentsLoading ? (
              <div className="loading-container">
                <div className="spinner large"></div>
                <p>Loading students...</p>
              </div>
            ) : studentsList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Students Found</h3>
                <p>There are no registered students yet. Students need to register first.</p>
              </div>
            ) : (
              <>
                <div className="attendance-legend" style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span className="badge-success">Present</span>
                  <span className="badge-danger">Absent</span>
                  <span className="badge-warning">Exempt</span>
                  <span className="badge-default">Unmarked</span>
                </div>
                <div className="table-container">
                  <table className="results-table attendance-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.map((student, idx) => (
                        <tr key={student._id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{student.name}</strong>
                          </td>
                          <td>{student.email}</td>
                          <td>
                            <div className="status-btn-group">
                              {["Present", "Absent", "Exempt"].map((status) => (
                                <button
                                  type="button"
                                  key={status}
                                  className={`btn btn-status ${
                                    student.status === status
                                      ? status === "Present"
                                        ? "active-present"
                                        : status === "Absent"
                                        ? "active-absent"
                                        : "active-exempt"
                                      : ""
                                  }`}
                                  onClick={() => updateStudentStatus(student._id, status)}
                                >
                                  {status === "Present"
                                    ? "✅"
                                    : status === "Absent"
                                    ? "❌"
                                    : "⏭️"}{" "}
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={bulkMarkAttendance}
                    disabled={loading.attendance}
                    style={{ padding: "12px 32px", fontSize: "16px" }}
                  >
                    {loading.attendance ? (
                      <span className="spinner"></span>
                    ) : (
                      "✅ Save All Attendance"
                    )}
                  </button>
                </div>
                {attendanceMessage && (
                  <p
                    className={
                      attendanceMessage.includes("✅") ? "success-msg" : "error-msg"
                    }
                    style={{ textAlign: "center" }}
                  >
                    {attendanceMessage}
                  </p>
                )}
              </>
            )}
          </div>
        );

      case "results":
        return (
          <div className="section fade-in">
            <h2>📈 Quiz Results</h2>
            {resultsLoading ? (
              <div className="loading-container">
                <div className="spinner large"></div>
                <p>Loading results...</p>
              </div>
            ) : allResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Results Yet</h3>
                <p>Quiz submissions will appear here once students start taking quizzes.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Question</th>
                      <th>Selected Answer</th>
                      <th>Correct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((sub, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{sub.studentId?.name || "Unknown Student"}</strong>
                          <br />
                          <span className="muted-text">{sub.studentId?.email || sub.studentId}</span>
                        </td>
                        <td>{sub.quizId?.question || "Deleted Quiz"}</td>
                        <td>{sub.selectedAnswer}</td>
                        <td>
                          <span className={sub.isCorrect ? "badge-success" : "badge-danger"}>
                            {sub.isCorrect ? "✅ Correct" : "❌ Wrong"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

