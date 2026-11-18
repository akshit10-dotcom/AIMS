const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isStrongPassword,
  isValidEmail,
  isValidName,
  isValidObjectId,
} = require("../middleware/validate");

test("password validation enforces length, letters, and digits", () => {
  assert.equal(isStrongPassword("Strong123"), true);
  assert.equal(isStrongPassword("short1"), false);
  assert.equal(isStrongPassword("lettersOnly"), false);
  assert.equal(isStrongPassword("12345678"), false);
  assert.equal(isStrongPassword(""), false);
});

test("email validation accepts trimmed addresses and rejects invalid values", () => {
  assert.equal(isValidEmail("  student@example.com  "), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(null), false);
});

test("name validation enforces length and supported characters", () => {
  assert.equal(isValidName("Ava O'Neil"), true);
  assert.equal(isValidName("A"), false);
  assert.equal(isValidName("Name123"), false);
  assert.equal(isValidName("A".repeat(51)), false);
});

test("object ID validation rejects malformed identifiers", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("not-an-id"), false);
});
