const { ZodError } = require("zod");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. JSON payload size limit exceeded (Express json limit)
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Payload too large. Max body size is 10kb.",
    });
  }

  // 2. CORS policy error
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // 3. Zod schema validation error
  if (err instanceof ZodError || err.name === "ZodError" || err.issues) {
    const issues = err.issues || err.errors || [];
    const formattedErrors = issues.map((e) => ({
      path: e.path ? e.path.join(".") : "",
      message: e.message,
    }));
    const firstMessage = issues[0]?.message || "Validation failed";
    return res.status(400).json({
      success: false,
      message: firstMessage,
      errors: formattedErrors,
    });
  }

  // 4. Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
  }

  // 5. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid format for ${err.path}: ${err.value}`,
    });
  }

  // 6. MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    return res.status(409).json({
      success: false,
      message: `Duplicate entry for ${keys.join(", ")}. Record already exists.`,
      duplicateKey: err.keyValue,
    });
  }

  // 7. Custom application error (AppError, BadRequestError, NotFoundError, etc.)
  if (err instanceof AppError || err.isOperational) {
    const response = {
      success: false,
      message: err.message,
    };
    if (err.errors) {
      response.errors = err.errors;
    }
    return res.status(err.statusCode || 500).json(response);
  }

  // 8. Unexpected/unhandled system error
  logger.error(
    {
      err,
      reqId: req.id,
      method: req.method,
      url: req.url,
      stack: err.stack,
    },
    "Unhandled Application Error"
  );

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
}

module.exports = errorHandler;
