const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));
}
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let code = err.code || "INTERNAL_ERROR";

  if (err.name === "ValidationError") {
    status = 400; code = "VALIDATION_ERROR";
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.code === 11000) {
    status = 409; code = "DUPLICATE_RESOURCE";
    message = "A record with this unique value already exists.";
  } else if (err.name === "CastError") {
    status = 400; code = "INVALID_ID"; message = "Invalid resource identifier.";
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error" : message,
    errorCode: code
  });
}
module.exports = { notFound, errorHandler };
