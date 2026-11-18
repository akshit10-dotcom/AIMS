// Custom MongoDB query injection sanitizer
// Compatible with Express 5 (which has read-only getters for req.query/req.body)
// Mutates objects in place instead of reassigning them.

const MONGO_KEYS = /^(\$|_id)/;

function cleanObject(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      cleanObject(item);
    }
    return obj;
  }

  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      // Remove keys that could be MongoDB operators ($gt, $where, $ne, etc.)
      if (MONGO_KEYS.test(key)) {
        delete obj[key];
      } else {
        cleanObject(value);
      }
    }
  }

  return obj;
}

module.exports = function sanitize(req, res, next) {
  // Sanitize in place (don't reassign, works with Express 5 getters)
  try {
    if (req.body && typeof req.body === "object") cleanObject(req.body);
    if (req.query && typeof req.query === "object") cleanObject(req.query);
    if (req.params && typeof req.params === "object") cleanObject(req.params);
  } catch (err) {
    console.error("Sanitization error:", err.message);
  }
  next();
};

