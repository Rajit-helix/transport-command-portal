export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details = null) {
  return new AppError(message, 400, "BAD_REQUEST", details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return new AppError(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found") {
  return new AppError(message, 404, "NOT_FOUND");
}

export function conflict(message = "Conflict") {
  return new AppError(message, 409, "CONFLICT");
}
