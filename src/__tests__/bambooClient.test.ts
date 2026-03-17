// Mock config first
jest.mock('../config', () => ({
  bambooConfig: {
    apiToken: 'test-token',
    companyDomain: 'test-company',
    baseUrl: 'https://test-company.bamboohr.com/api/v1',
    debug: false
  }
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

import { BambooHRClient } from '../bambooClient';

describe('BambooClient', () => {
  let client: BambooHRClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    const axios = require('axios');
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    client = new BambooHRClient();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create BambooHRClient instance', () => {
      expect(client).toBeInstanceOf(BambooHRClient);
    });
  });

  describe('get method', () => {
    it('should make GET request with params', async () => {
      const mockResponse = { data: { test: 'data' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.get('/test-endpoint', { param: 'value' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint', { 
        params: { param: 'value' } 
      });
      expect(result).toEqual({ test: 'data' });
    });

    it('should make GET request without params', async () => {
      const mockResponse = { data: { test: 'data' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.get('/test-endpoint');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint', { params: undefined });
      expect(result).toEqual({ test: 'data' });
    });

    it('should handle GET request errors', async () => {
      const mockError = { message: 'Network error' };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow('Network error: Network error');
    });
  });

  describe('getBuffer method', () => {
    it('should make GET request for buffer data', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockResponse = { data: mockArrayBuffer };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getBuffer('/test-file');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-file', {
        params: undefined,
        responseType: 'arraybuffer'
      });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle getBuffer errors', async () => {
      const mockError = { message: 'File not found' };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.getBuffer('/test-file')).rejects.toThrow('Network error: File not found');
    });
  });

  describe('error handling', () => {
    it('should handle axios errors with response data', async () => {
      const mockError = { 
        response: { 
          data: { message: 'API Error' },
          status: 400
        }, 
        message: 'Request failed'
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow('API Error');
    });

    it('should handle axios errors with response data but no message', async () => {
      const mockError = { 
        response: { 
          data: { error: 'Some other error format' },
          status: 500
        }, 
        message: 'Server error'
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow('BambooHR API error (500): Some other error format');
    });

    it('should prefer detailed BambooHR validation payloads and headers', async () => {
      const mockError = {
        response: {
          data: {
            errors: [{
              error: 'Validation failed',
              description: 'amount is required',
            }],
          },
          headers: {
            'x-bamboohr-errormessage': 'Invalid time off request',
          },
          status: 400,
        },
        message: 'Request failed with status code 400',
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow(
        'BambooHR API error (400): Invalid time off request',
      );
    });

    it('should handle specific HTTP status codes', async () => {
      const testCases = [
        { status: 401, expected: 'Authentication failed. Please check your API token.' },
        { status: 403, expected: 'Access forbidden. You may not have permission to access this resource.' },
        { status: 404, expected: 'Resource not found.' },
        { status: 429, expected: 'Rate limit exceeded. Please try again later.' }
      ];

      for (const { status, expected } of testCases) {
        const mockError = { 
          response: { 
            data: {},
            status
          }, 
          message: 'HTTP error'
        };
        mockAxiosInstance.get.mockRejectedValue(mockError);

        await expect(client.get('/test-endpoint')).rejects.toThrow(expected);
      }
    });

    it('should handle timeout errors', async () => {
      const mockError = { 
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow('Request timeout. Please try again.');
    });

    it('should handle axios errors without response data', async () => {
      const mockError = { 
        message: 'Network timeout'
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(client.get('/test-endpoint')).rejects.toThrow('Network error: Network timeout');
    });
  });

  describe('POST method', () => {
    it('should make POST request with data', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.post('/test-endpoint', { key: 'value' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test-endpoint', { key: 'value' });
      expect(result).toEqual({ success: true });
    });

    it('should handle POST errors', async () => {
      const mockError = { message: 'POST failed' };
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(client.post('/test-endpoint', {})).rejects.toThrow('Network error: POST failed');
    });
  });

  describe('PUT method', () => {
    it('should make PUT request with data', async () => {
      const mockResponse = { data: { updated: true } };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await client.put('/test-endpoint', { key: 'newvalue' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test-endpoint', { key: 'newvalue' });
      expect(result).toEqual({ updated: true });
    });

    it('should handle PUT errors', async () => {
      const mockError = { message: 'PUT failed' };
      mockAxiosInstance.put.mockRejectedValue(mockError);

      await expect(client.put('/test-endpoint', {})).rejects.toThrow('Network error: PUT failed');
    });

    it('should return detailed PUT response metadata when requested', async () => {
      const mockResponse = {
        data: { created: true },
        status: 201,
        headers: { location: '/employees/123/time_off/history/456' },
      };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await client.putDetailed('/test-endpoint', { key: 'value' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test-endpoint', { key: 'value' });
      expect(result).toEqual({
        data: { created: true },
        status: 201,
        headers: { location: '/employees/123/time_off/history/456' },
      });
    });
  });

  describe('DELETE method', () => {
    it('should make DELETE request', async () => {
      const mockResponse = { data: { deleted: true } };
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await client.delete('/test-endpoint');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test-endpoint');
      expect(result).toEqual({ deleted: true });
    });

    it('should handle DELETE errors', async () => {
      const mockError = { message: 'DELETE failed' };
      mockAxiosInstance.delete.mockRejectedValue(mockError);

      await expect(client.delete('/test-endpoint')).rejects.toThrow('Network error: DELETE failed');
    });
  });
});
