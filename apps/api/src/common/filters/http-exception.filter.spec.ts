import { ArgumentsHost, HttpException, Logger } from '@nestjs/common';
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
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('formats client errors without logging', () => {
    const host = createHost('/api/test');

    filter.catch(new HttpException({ message: 'bad request' }, 400), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'bad request' }),
    );
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('logs server errors', () => {
    const host = createHost('/api/test');

    filter.catch(new HttpException('boom', 500), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(loggerSpy).toHaveBeenCalled();
  });
});
