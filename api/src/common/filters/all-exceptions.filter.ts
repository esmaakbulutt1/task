import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

interface HttpErrorResponse {
  message?: string | string[];
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = this.getErrorDetails(exceptionResponse, statusCode);

    if (!(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `Unexpected error while handling ${request.method} ${request.originalUrl}.`,
        stack,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message: details.message,
      error: details.error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorDetails(
    response: string | object | undefined,
    statusCode: number,
  ): Required<HttpErrorResponse> {
    const fallbackError = STATUS_CODES[statusCode] ?? 'Error';

    if (typeof response === 'string') {
      return { message: response, error: fallbackError };
    }

    if (this.isHttpErrorResponse(response)) {
      return {
        message: response.message ?? fallbackError,
        error: response.error ?? fallbackError,
      };
    }

    return {
      message:
        statusCode === 500 ? 'Beklenmeyen bir hata oluştu.' : fallbackError,
      error: fallbackError,
    };
  }

  private isHttpErrorResponse(value: unknown): value is HttpErrorResponse {
    return typeof value === 'object' && value !== null;
  }
}
