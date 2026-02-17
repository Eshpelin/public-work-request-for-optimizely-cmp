export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CMP_API_ERROR = "CMP_API_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
}

/**
 * Application error class that carries an HTTP status code, a
 * machine-readable error code, and an optional request ID for
 * tracing purposes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    requestId?: string
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;

    // Ensure proper prototype chain for instanceof checks.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

/**
 * Formats an error into a standardized JSON response shape.
 * If the error is an AppError, its code and status information
 * are used directly. Otherwise it falls back to INTERNAL_ERROR.
 */
export function formatErrorResponse(
  error: unknown,
  requestId?: string
): ErrorResponseBody {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        requestId: requestId || error.requestId,
      },
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      requestId,
    },
  };
}
