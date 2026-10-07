/**
 * Standard API response wrapper used for ALL successful responses.
 *
 * Why: Gives the Angular client a consistent shape to parse.
 * The frontend always knows that real data lives in `data`, and
 * metadata (pagination, messages) lives alongside it.
 */
export class ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

/**
 * Standard shape for error responses.
 *
 * Why: Prevents the frontend from having to guess error shapes.
 * Also keeps us from leaking stack traces or internal messages.
 */
export class ApiErrorResponse {
  readonly success: false = false;
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;

  constructor(statusCode: number, error: string, message: string) {
    this.statusCode = statusCode;
    this.error = error;
    this.message = message;
  }
}
