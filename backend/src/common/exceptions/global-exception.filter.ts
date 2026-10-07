import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../models/api-response.model';

/**
 * Global exception filter — catches ALL unhandled exceptions.
 *
 * Why: We want one place that decides what goes back to the client.
 * Without this, NestJS might leak stack traces or return inconsistent
 * error shapes from different parts of the application.
 *
 * What it handles:
 * 1. HttpException (thrown by NestJS guards, pipes, our own code)
 * 2. Any other Error (unexpected crashes, database errors, etc.)
 *
 * Security: We NEVER send stack traces or raw error messages to the
 * client in production. Only in development for debugging.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = Array.isArray(resp['message'])
          ? (resp['message'] as string[]).join(', ')
          : String(resp['message'] ?? exception.message);
        error = String(resp['error'] ?? error);
      }
    } else if (exception instanceof Error) {
      // Log the full error internally but never send it to the client
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception.stack,
      );
      message =
        process.env['NODE_ENV'] === 'development'
          ? exception.message
          : 'An unexpected error occurred';
    }

    this.logger.warn(
      `HTTP ${statusCode} on ${request.method} ${request.url} — ${message}`,
    );

    response.status(statusCode).json(new ApiErrorResponse(statusCode, error, message));
  }
}
