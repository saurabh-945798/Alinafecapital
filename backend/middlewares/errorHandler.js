import { ApiError } from "../utils/ApiError.js";
import { ZodError } from "zod";
import { sanitizeForLog } from "../utils/paymentSecurity.js";

export const errorHandler = (err, req, res, next) => {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let errorCode = err instanceof ApiError ? err.errorCode : "INTERNAL_ERROR";
  let message = err?.message || "Internal Server Error";
  let details = err instanceof ApiError ? err.details : null;

  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";
    details = err.issues;
  }

  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Invalid token";
  }

  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Token expired";
  }

  if (err?.code === 11000) {
    statusCode = 409;
    errorCode = "DUPLICATE_KEY";
    const dupField = Object.keys(err.keyPattern || {})[0] || "field";
    message = `${dupField} already exists`;
  }

  if (err?.errorCode === "CORS_ORIGIN_NOT_ALLOWED") {
    statusCode = err.statusCode || 403;
    errorCode = "CORS_ORIGIN_NOT_ALLOWED";
    message = err.message || "CORS origin not allowed";
  }

  // Keep intentional ApiError messages visible even for 5xx service errors
  // such as MPGS configuration or gateway connectivity failures. Only hide
  // unexpected programming/runtime errors behind a generic message.
  if (statusCode >= 500 && !(err instanceof ApiError)) {
    message = "Internal server error";
  }

  // Never print raw card/payment payloads to the terminal or log files.
  console.error("Error:", sanitizeForLog(err));

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    ...(details ? { details } : {}),
  });
};
