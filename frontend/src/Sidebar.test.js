import { fireEvent, render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

const user = {
  id: "user-1",
  name: "Ava Student",
  email: "ava@example.com",
  role: "student",
};

test("renders student navigation and reports section changes", () => {
  const onSectionChange = jest.fn();
  render(
    <Sidebar
      user={user}
      activeSection="dashboard"
      onSectionChange={onSectionChange}
      onLogout={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Take Quizzes/ }));

  expect(screen.getByText("Ava Student")).toBeInTheDocument();
  expect(onSectionChange).toHaveBeenCalledWith("quizzes");
  expect(screen.queryByRole("button", { name: /Manage Quizzes/ })).not.toBeInTheDocument();
});

test("renders teacher navigation and supports logout", () => {
  const onLogout = jest.fn();
  render(
    <Sidebar
      user={{ ...user, role: "teacher" }}
      activeSection="dashboard"
      onSectionChange={jest.fn()}
      onLogout={onLogout}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Logout/ }));

  expect(screen.getByRole("button", { name: /Manage Quizzes/ })).toBeInTheDocument();
  expect(onLogout).toHaveBeenCalledTimes(1);
});
