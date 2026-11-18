import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login";
import { api } from "./api";

jest.mock("./api", () => ({
  api: {
    login: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("login fields have accessible labels", () => {
  render(<Login onLogin={jest.fn()} onSwitchToRegister={jest.fn()} />);

  expect(screen.getByLabelText("Role")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});

test("submits selected role and credentials and passes the session to the parent", async () => {
  const onLogin = jest.fn();
  api.login.mockResolvedValue({
    token: "jwt-token",
    user: { id: "user-1", name: "Ava", email: "ava@example.com" },
  });
  render(<Login onLogin={onLogin} onSwitchToRegister={jest.fn()} />);

  await userEvent.selectOptions(screen.getByLabelText("Role"), "teacher");
  await userEvent.type(screen.getByLabelText("Email"), "ava@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Strong123");
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(api.login).toHaveBeenCalledWith({
      email: "ava@example.com",
      password: "Strong123",
      role: "teacher",
    });
  });
  expect(onLogin).toHaveBeenCalledWith({
    token: "jwt-token",
    id: "user-1",
    name: "Ava",
    email: "ava@example.com",
    role: "teacher",
  });
});

test("shows API errors in an accessible alert", async () => {
  api.login.mockRejectedValue(new Error("Invalid email or password"));
  render(<Login onLogin={jest.fn()} onSwitchToRegister={jest.fn()} />);
  await userEvent.type(screen.getByLabelText("Email"), "ava@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrongpass1");
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid email or password"
  );
});
