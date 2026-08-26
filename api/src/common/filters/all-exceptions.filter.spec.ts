import {
  BadRequestException,
  type ArgumentsHost,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const status = jest.fn();
  const json = jest.fn();
  const request = {
    method: 'POST',
    originalUrl: '/tasks',
  } as Request;
  const response = { status, json } as unknown as Response;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
  const filter = new AllExceptionsFilter();

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    status.mockReturnValue(response);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('standardizes HTTP exception responses', () => {
    filter.catch(
      new BadRequestException({
        message: ['title should not be empty'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['title should not be empty'],
        error: 'Bad Request',
        path: '/tasks',
        timestamp: expect.any(String),
      }),
    );
  });

  it('hides unexpected error details and returns 500', () => {
    filter.catch(new Error('database password must stay private'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Beklenmeyen bir hata oluştu.',
        error: 'Internal Server Error',
      }),
    );
  });
});
