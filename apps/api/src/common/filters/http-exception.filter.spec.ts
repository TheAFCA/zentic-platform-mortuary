import { ArgumentsHost, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { HttpExceptionFilter } from './http-exception.filter';

const createHost = (url: string, method = 'GET') =>
  ({
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  }) as unknown as ArgumentsHost;

const response = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
};

const request = {
  url: '/api/test',
  method: 'GET',
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let sentrySpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
    sentrySpy = jest.spyOn(Sentry, 'captureException').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    sentrySpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('formats client errors without logging', () => {
    const host = createHost('/api/test');

    filter.catch(new HttpException({ message: 'bad request' }, 400), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'bad request' }),
    );
    expect(sentrySpy).not.toHaveBeenCalled();
  });

  it('logs server errors', () => {
    const host = createHost('/api/test');

    filter.catch(new HttpException('boom', 500), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(sentrySpy).toHaveBeenCalled();
  });
});
