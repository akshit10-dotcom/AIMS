import { api, clearSession, isTokenExpired, loadSession, saveSession } from "./api";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: jest.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("saves, restores, and clears a session", () => {
  const user = { id: "student-1", name: "Ava" };
  saveSession("token-123", user);

  expect(loadSession()).toEqual({ token: "token-123", user });

  clearSession();
  expect(loadSession()).toBeNull();
});

test("treats expired and malformed tokens as expired", () => {
  const encodePayload = (payload) =>
    window.btoa(JSON.stringify(payload)).replace(/=/g, "");
  const tokenWithExpiry = (exp) => `header.${encodePayload({ exp })}.signature`;

  expect(isTokenExpired(tokenWithExpiry(Math.floor(Date.now() / 1000) + 60))).toBe(false);
  expect(isTokenExpired(tokenWithExpiry(Math.floor(Date.now() / 1000) - 60))).toBe(true);
  expect(isTokenExpired("not-a-jwt")).toBe(true);
});

test("sends login JSON and returns the parsed response", async () => {
  const result = { token: "jwt", user: { id: "student-1" } };
  global.fetch.mockResolvedValue(jsonResponse(result));

  await expect(
    api.login({ email: "ava@example.com", password: "Strong123", role: "student" })
  ).resolves.toEqual(result);

  expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:5000/auth/login",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ava@example.com",
        password: "Strong123",
        role: "student",
      }),
    })
  );
});

test("sends the bearer token for protected requests", async () => {
  global.fetch.mockResolvedValue(jsonResponse([]));

  await expect(api.getQuizzes("jwt")).resolves.toEqual([]);

  expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:5000/quiz",
    expect.objectContaining({
      method: "GET",
      headers: { Authorization: "Bearer jwt" },
      body: undefined,
    })
  );
});

test("throws API error details for non-success responses", async () => {
  global.fetch.mockResolvedValue(jsonResponse({ error: "Invalid input" }, 400));

  await expect(api.getQuizzes()).rejects.toMatchObject({
    message: "Invalid input",
    status: 400,
    data: { error: "Invalid input" },
  });
});

test("does not parse non-JSON responses", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    status: 204,
    headers: { get: () => "text/plain" },
    json: jest.fn(),
  });

  await expect(api.getQuizzes()).resolves.toBeNull();
});

test("clears the session and notifies once after an expired protected request", async () => {
  localStorage.setItem("aims_token", "old-token");
  localStorage.setItem("aims_user", JSON.stringify({ id: "student-1" }));
  global.fetch.mockResolvedValue(jsonResponse({ error: "Session expired" }, 401));
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(global, "setTimeout").mockImplementation(() => 0);

  await expect(api.getQuizzes("old-token")).rejects.toMatchObject({ status: 401 });

  expect(localStorage.getItem("aims_token")).toBeNull();
  expect(localStorage.getItem("aims_user")).toBeNull();
  expect(alertSpy).toHaveBeenCalledTimes(1);
});

test("does not clear the session when an auth request returns 401", async () => {
  localStorage.setItem("aims_token", "old-token");
  global.fetch.mockResolvedValue(jsonResponse({ error: "Invalid credentials" }, 401));
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

  await expect(api.login({ email: "a@example.com", password: "bad" })).rejects.toMatchObject({
    status: 401,
  });

  expect(localStorage.getItem("aims_token")).toBe("old-token");
  expect(alertSpy).not.toHaveBeenCalled();
});
