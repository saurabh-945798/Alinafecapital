export class ApiError extends Error {
  constructor(
    statusCode = 500,
    message = "Internal Server Error",
    errorCode = "INTERNAL_ERROR",
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}
