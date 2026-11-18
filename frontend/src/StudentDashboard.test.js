import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentDashboard from "./StudentDashboard";
import { api } from "./api";

jest.mock("./api", () => ({
  api: {
    getAttendancePercentage: jest.fn(),
    getLectures: jest.fn(),
    getQuizzes: jest.fn(),
    getQuizResults: jest.fn(),
    submitQuiz: jest.fn(),
  },
}));

const student = {
  id: "student-1",
  name: "Ava Student",
  email: "ava@example.com",
  token: "student-token",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  api.getAttendancePercentage.mockResolvedValue({
    percentage: 80,
    attended: 8,
    totalClasses: 10,
    threshold: 75,
    meetsRequirement: true,
  });
  api.getLectures.mockResolvedValue([]);
  api.getQuizzes.mockResolvedValue([]);
  api.getQuizResults.mockResolvedValue([]);
  api.submitQuiz.mockResolvedValue({ isCorrect: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("loads student dashboard statistics", async () => {
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);

  expect(await screen.findByText("80%")).toBeInTheDocument();
  expect(screen.getByText(/Meets 75%/)).toBeInTheDocument();
  expect(api.getAttendancePercentage).toHaveBeenCalledWith("student-1", "student-token");
  expect(api.getQuizResults).toHaveBeenCalledWith("student-1", "student-token");
});

test("shows an empty quiz state when no quizzes are available", async () => {
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Take Quizzes/ }));

  expect(await screen.findByText("No Quizzes Available")).toBeInTheDocument();
});

test("requires an answer before submitting a quiz", async () => {
  api.getQuizzes.mockResolvedValue([
    { _id: "quiz-1", question: "What is 2 + 2?", options: ["4", "5"] },
  ]);
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Take Quizzes/ }));
  await screen.findByText("What is 2 + 2?");

  await userEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

  expect(window.alert).toHaveBeenCalledWith("Please select an answer first!");
  expect(api.submitQuiz).not.toHaveBeenCalled();
});

test("submits a selected quiz answer and marks the quiz submitted", async () => {
  api.getQuizzes.mockResolvedValue([
    { _id: "quiz-1", question: "What is 2 + 2?", options: ["4", "5"] },
  ]);
  api.getQuizResults
    .mockResolvedValueOnce([])
    .mockResolvedValue([{ quizId: { _id: "quiz-1" }, selectedAnswer: "4", isCorrect: true }]);
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Take Quizzes/ }));

  await userEvent.click(await screen.findByRole("radio", { name: "4" }));
  await userEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

  await waitFor(() => {
    expect(api.submitQuiz).toHaveBeenCalledWith(
      { quizId: "quiz-1", selectedAnswer: "4" },
      "student-token"
    );
  });
  expect(window.alert).toHaveBeenCalledWith("✅ Correct Answer!");
  expect(await screen.findByRole("button", { name: "✅ Submitted" })).toBeDisabled();
});

test("displays fetched quiz results", async () => {
  api.getQuizResults.mockResolvedValue([
    {
      quizId: { _id: "quiz-1", question: "What is 2 + 2?" },
      selectedAnswer: "4",
      isCorrect: true,
    },
  ]);
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /My Results/ }));

  expect(await screen.findByText("What is 2 + 2?")).toBeInTheDocument();
  expect(screen.getByText("1 / 1")).toBeInTheDocument();
});

test("shows fetch errors instead of failing silently", async () => {
  api.getAttendancePercentage.mockRejectedValue(new Error("offline"));
  api.getLectures.mockReturnValue(new Promise(() => {}));
  api.getQuizzes.mockReturnValue(new Promise(() => {}));
  api.getQuizResults.mockReturnValue(new Promise(() => {}));
  render(<StudentDashboard user={student} onLogout={jest.fn()} />);

  expect(await screen.findByText("Failed to fetch attendance data.")).toBeInTheDocument();
});
