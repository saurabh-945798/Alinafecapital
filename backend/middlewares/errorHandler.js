import { ApiError } from "../utils/ApiError.js";
import { ZodError } from "zod";

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

  if (statusCode >= 500) {
    message = "Internal server error";
  }

  console.error("Error:", err);

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    ...(details ? { details } : {}),
  });
};
