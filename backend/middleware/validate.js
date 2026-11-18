const mongoose = require("mongoose");

// Email validation regex
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Strong password: min 8 chars, at least one letter and one number
function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

// Validate an email string
function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

// Validate a name string (2-50 chars, letters, spaces, dashes, apostrophes)
function isValidName(name) {
  return (
    typeof name === "string" &&
    name.trim().length >= 2 &&
    name.trim().length <= 50 &&
    /^[a-zA-Z][a-zA-Z\s'-]*$/.test(name.trim())
  );
}

// Validate a MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = {
  EMAIL_REGEX,
  isStrongPassword,
  isValidEmail,
  isValidName,
  isValidObjectId,
};

