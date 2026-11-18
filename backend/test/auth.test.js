const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const authRoutes = require("../routes/auth");

process.env.TEACHER_REGISTRATION_CODE = "expected-teacher-code";

async function createAuthServer(t) {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );

  return `http://127.0.0.1:${server.address().port}`;
}

async function register(baseUrl, body) {
  return fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify(body),
  });
}

const validStudent = {
  name: "Ava Student",
  email: "ava@example.com",
  password: "Strong123",
  role: "student",
};

test("registration rejects missing required fields", async (t) => {
  const baseUrl = await createAuthServer(t);
  const response = await register(baseUrl, { email: "ava@example.com" });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "All fields are required" });
});

test("registration rejects invalid name, email, password, and role", async (t) => {
  const baseUrl = await createAuthServer(t);
  const cases = [
    [{ ...validStudent, name: "A" }, "Name must be 2-50 characters"],
    [{ ...validStudent, email: "invalid" }, "Please enter a valid email"],
    [{ ...validStudent, password: "weak" }, "Password must be at least 8 characters"],
    [{ ...validStudent, role: "administrator" }, "Role must be teacher or student"],
  ];

  for (const [body, expectedMessage] of cases) {
    const response = await register(baseUrl, body);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, new RegExp(expectedMessage));
  }
});

test("teacher registration rejects a missing or incorrect registration code", async (t) => {
  const baseUrl = await createAuthServer(t);
  const response = await register(baseUrl, { ...validStudent, role: "teacher" });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Invalid teacher registration code" });
});
