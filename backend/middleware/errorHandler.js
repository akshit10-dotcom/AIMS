// 404 handler for unknown routes
function notFoundHandler(req, res, next) {
  res.status(404).json({ error: "Route not found" });
}

// Centralized error handler
function errorHandler(err, req, res, next) {
  // CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed by CORS policy" });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: errors[0] });
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res
      .status(400)
      .json({ error: `A record with this ${field} already exists` });
  }

  // Invalid ObjectId
  if (err.name === "CastError" || err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }

  // JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };

