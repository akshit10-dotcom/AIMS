import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherDashboard from "./TeacherDashboard";
import { api } from "./api";

jest.mock("./api", () => ({
  api: {
    createQuiz: jest.fn(),
    generateAiQuiz: jest.fn(),
    deleteQuiz: jest.fn(),
    addLecture: jest.fn(),
    deleteLecture: jest.fn(),
    bulkMarkAttendance: jest.fn(),
    getStudentsList: jest.fn(),
    getQuizzes: jest.fn(),
    getLectures: jest.fn(),
    getAllQuizResults: jest.fn(),
  },
}));

const teacher = {
  id: "teacher-1",
  name: "Taylor Teacher",
  email: "taylor@example.com",
  role: "teacher",
  token: "teacher-token",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(window, "confirm").mockReturnValue(true);
  api.createQuiz.mockResolvedValue({ message: "Quiz created" });
  api.generateAiQuiz.mockResolvedValue({ message: "AI quiz created" });
  api.deleteQuiz.mockResolvedValue({});
  api.addLecture.mockResolvedValue({ message: "Lecture added" });
  api.deleteLecture.mockResolvedValue({});
  api.bulkMarkAttendance.mockResolvedValue({ message: "Attendance saved" });
  api.getStudentsList.mockResolvedValue({ students: [] });
  api.getQuizzes.mockResolvedValue([]);
  api.getLectures.mockResolvedValue([]);
  api.getAllQuizResults.mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("validates quiz options before calling the API", async () => {
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Manage Quizzes/ }));
  await screen.findByText("No Quizzes Yet");
  await userEvent.type(screen.getByPlaceholderText("Enter the quiz question"), "Capital of France?");
  await userEvent.type(
    screen.getByPlaceholderText("e.g. Paris, London, Berlin, Madrid"),
    "Paris"
  );
  await userEvent.type(screen.getByPlaceholderText("Enter the correct answer"), "Paris");
  await userEvent.click(screen.getByRole("button", { name: "Create Quiz" }));

  expect(await screen.findByText(/Please provide at least 2 options/)).toBeInTheDocument();
  expect(api.createQuiz).not.toHaveBeenCalled();
});

test("creates a quiz with trimmed options and refreshes the quiz list", async () => {
  api.getQuizzes.mockResolvedValueOnce([]).mockResolvedValue([
    { _id: "quiz-1", question: "Capital of France?", options: ["Paris", "London"] },
  ]);
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Manage Quizzes/ }));
  await screen.findByText("No Quizzes Yet");
  await userEvent.type(screen.getByPlaceholderText("Enter the quiz question"), "Capital of France?");
  await userEvent.type(
    screen.getByPlaceholderText("e.g. Paris, London, Berlin, Madrid"),
    " Paris, London "
  );
  await userEvent.type(screen.getByPlaceholderText("Enter the correct answer"), "Paris");
  await userEvent.click(screen.getByRole("button", { name: "Create Quiz" }));

  await waitFor(() => {
    expect(api.createQuiz).toHaveBeenCalledWith(
      {
        question: "Capital of France?",
        options: ["Paris", "London"],
        answer: "Paris",
      },
      "teacher-token"
    );
  });
  expect(await screen.findByText("Capital of France?")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("Loading quizzes...")).not.toBeInTheDocument());
  expect(screen.getByText("✅ Quiz created")).toBeInTheDocument();
});

test("bulk attendance sends only marked student records", async () => {
  api.getStudentsList.mockResolvedValue({
    students: [
      { _id: "student-1", name: "Ava Student", email: "ava@example.com", status: "Unmarked" },
      { _id: "student-2", name: "Sam Student", email: "sam@example.com", status: "Unmarked" },
    ],
  });
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Mark Attendance/ }));
  expect(await screen.findByText("Ava Student")).toBeInTheDocument();

  await userEvent.click(screen.getAllByRole("button", { name: /Present/ })[0]);
  await userEvent.click(screen.getByRole("button", { name: /Save All Attendance/ }));

  await waitFor(() => {
    expect(api.bulkMarkAttendance).toHaveBeenCalledWith(
      {
        records: [{ studentId: "student-1", status: "Present" }],
        date: new Date().toISOString().split("T")[0],
      },
      "teacher-token"
    );
  });
  expect(await screen.findByText("✅ Attendance saved")).toBeInTheDocument();
});

test("refuses to submit attendance when no students are marked", async () => {
  api.getStudentsList.mockResolvedValue({
    students: [
      { _id: "student-1", name: "Ava Student", email: "ava@example.com", status: "Unmarked" },
    ],
  });
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Mark Attendance/ }));
  await screen.findByText("Ava Student");
  await userEvent.click(screen.getByRole("button", { name: /Save All Attendance/ }));

  expect(await screen.findByText(/No changes made/)).toBeInTheDocument();
  expect(api.bulkMarkAttendance).not.toHaveBeenCalled();
});

test("creates a lecture with the submitted schedule", async () => {
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Manage Lectures/ }));
  const form = screen.getByRole("button", { name: "Add Lecture" }).closest("form");
  const dateInputs = form.querySelectorAll('input[type="date"]');
  const timeInputs = form.querySelectorAll('input[type="time"]');

  await userEvent.type(screen.getByPlaceholderText("e.g. Mathematics"), "Biology");
  fireEvent.change(dateInputs[0], { target: { value: "2026-11-20" } });
  fireEvent.change(timeInputs[0], { target: { value: "09:00" } });
  fireEvent.change(timeInputs[1], { target: { value: "10:00" } });
  await userEvent.click(screen.getByRole("button", { name: "Add Lecture" }));

  await waitFor(() => {
    expect(api.addLecture).toHaveBeenCalledWith(
      {
        subject: "Biology",
        date: "2026-11-20",
        startTime: "09:00",
        endTime: "10:00",
      },
      "teacher-token"
    );
  });
  expect(await screen.findByText("✅ Lecture added")).toBeInTheDocument();
});

test("loads and displays student quiz results", async () => {
  api.getAllQuizResults.mockResolvedValue([
    {
      studentId: { name: "Ava Student", email: "ava@example.com" },
      quizId: { question: "Capital of France?" },
      selectedAnswer: "Paris",
      isCorrect: true,
    },
  ]);
  render(<TeacherDashboard user={teacher} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /View Results/ }));

  expect(await screen.findByText("Ava Student")).toBeInTheDocument();
  expect(screen.getByText("Capital of France?")).toBeInTheDocument();
  expect(api.getAllQuizResults).toHaveBeenCalledWith("teacher-token");
});
