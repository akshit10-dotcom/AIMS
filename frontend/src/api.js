const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
const TOKEN_KEY = "aims_token";
const USER_KEY = "aims_user";
export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}
export function loadSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (!token || !userRaw) return null;
    const user = JSON.parse(userRaw);
    return { token, user };
  } catch (err) {
    return null;
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}
export function isTokenExpired(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (err) {
    return true;
  }
}
let sessionExpiredNotified = false;
function handleUnauthorized() {
  clearSession();
  if (!sessionExpiredNotified) {
    sessionExpiredNotified = true;
    alert("Your session has expired. Please log in again.");
  }
  setTimeout(() => {
    window.location.href = "/";
  }, 300);
}
async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) {
      handleUnauthorized();
    }

    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
export const api = {
  // Auth
  login: (body) => request("/auth/login", { method: "POST", body }),
  register: (body) => request("/auth/register", { method: "POST", body }),

  // Attendance (teacher)
  markAttendance: (body, token) => request("/attendance/mark", { method: "POST", body, token }),
  bulkMarkAttendance: (body, token) => request("/attendance/bulk-mark", { method: "POST", body, token }),
  getStudentsList: (date, token) => request(`/attendance/students-list?date=${date}`, { token }),

  // Attendance (student)
  getAttendancePercentage: (studentId, token) => request(`/attendance/percentage/${studentId}`, { token }),
  getAttendanceRecords: (studentId, token) => request(`/attendance/all/${studentId}`, { token }),

  // Quizzes
  createQuiz: (body, token) => request("/quiz/create", { method: "POST", body, token }),
  generateAiQuiz: (body, token) => request("/quiz/ai-generate", { method: "POST", body, token }),
  getQuizzes: (token) => request("/quiz", { token }),
  deleteQuiz: (quizId, token) => request(`/quiz/${quizId}`, { method: "DELETE", token }),
  submitQuiz: (body, token) => request("/quiz/submit", { method: "POST", body, token }),
  getQuizResults: (studentId, token) => request(`/quiz/results/${studentId}`, { token }),
  getAllQuizResults: (token) => request("/quiz/all-results", { token }),

  // Lectures
  addLecture: (body, token) => request("/lecture/add", { method: "POST", body, token }),
  getLectures: (date, token) => request(`/lecture/${date}`, { token }),
  deleteLecture: (lectureId, token) => request(`/lecture/${lectureId}`, { method: "DELETE", token }),
};
export { API_URL };