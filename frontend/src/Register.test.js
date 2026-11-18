import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "./Register";
import { api } from "./api";

jest.mock("./api", () => ({
  api: {
    register: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("shows the teacher code field only for teacher registration", async () => {
  render(<Register onRegister={jest.fn()} onSwitchToLogin={jest.fn()} />);
  expect(screen.queryByLabelText("Teacher Registration Code")).not.toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Role"), "teacher");

  expect(screen.getByLabelText("Teacher Registration Code")).toBeInTheDocument();
});

test("rejects mismatched passwords without sending a registration request", async () => {
  render(<Register onRegister={jest.fn()} onSwitchToLogin={jest.fn()} />);
  await userEvent.type(screen.getByLabelText("Full Name"), "Ava O'Neil");
  await userEvent.type(screen.getByLabelText("Email"), "ava@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Strong123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "Different123");
  fireEvent.click(screen.getByRole("button", { name: "Register" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
  expect(api.register).not.toHaveBeenCalled();
});

test("submits valid student registration and passes the session to the parent", async () => {
  const onRegister = jest.fn();
  api.register.mockResolvedValue({
    token: "jwt-token",
    user: { id: "user-1", name: "Ava O'Neil", email: "ava@example.com", role: "student" },
  });
  render(<Register onRegister={onRegister} onSwitchToLogin={jest.fn()} />);

  await userEvent.type(screen.getByLabelText("Full Name"), "Ava O'Neil");
  await userEvent.type(screen.getByLabelText("Email"), "ava@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Strong123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "Strong123");
  fireEvent.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() => {
    expect(api.register).toHaveBeenCalledWith({
      name: "Ava O'Neil",
      email: "ava@example.com",
      password: "Strong123",
      role: "student",
      teacherCode: undefined,
    });
  });
  expect(onRegister).toHaveBeenCalledWith({
    token: "jwt-token",
    id: "user-1",
    name: "Ava O'Neil",
    email: "ava@example.com",
    role: "student",
  });
});
