import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { bambooConfig } from './config.js';
import type { BambooErrorResponse } from './types.js';

export interface BambooHRClientOptions {
  apiToken: string;
  baseUrl: string;
  debug?: boolean;
}

export interface BambooHRResponse<T = any> {
  data: T;
  headers: Record<string, string | string[] | undefined>;
  status: number;
}

export class BambooHRClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(options?: BambooHRClientOptions) {
    const config = options ?? this.getDefaultOptions();
    this.baseUrl = config.baseUrl;

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Authorization': this.createAuthHeader(config.apiToken),
      },
      timeout: 30000, // 30 second timeout
    });

    // Request interceptor for logging
    if (config.debug) {
      this.client.interceptors.request.use((config) => {
        console.log(`[BambooHR] ${config.method?.toUpperCase()} ${config.url}`);
        if (config.params) {
          console.log(`[BambooHR] Params:`, config.params);
        }
        return config;
      });

      this.client.interceptors.response.use(
        (response) => {
          console.log(`[BambooHR] Response ${response.status} from ${response.config.url}`);
          return response;
        },
        (error) => {
          console.error(`[BambooHR] Error ${error.response?.status} from ${error.config?.url}:`, error.message);
          return Promise.reject(error);
        }
      );
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private getDefaultOptions(): BambooHRClientOptions {
    if (!bambooConfig.apiToken || !bambooConfig.baseUrl) {
      throw new Error('Default BambooHR client credentials are not configured');
    }

    return {
      apiToken: bambooConfig.apiToken,
      baseUrl: bambooConfig.baseUrl,
      debug: bambooConfig.debug,
    };
  }

  private createAuthHeader(apiToken: string): string {
    // BambooHR uses Basic Auth with token as username and "x" as password
    const credentials = Buffer.from(`${apiToken}:x`).toString('base64');
    return `Basic ${credentials}`;
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as BambooErrorResponse;
      
      switch (status) {
        case 401:
          return new Error('Authentication failed. Please check your API token.');
        case 403:
          return new Error('Access forbidden. You may not have permission to access this resource.');
        case 404:
          return new Error('Resource not found.');
        case 429:
          return new Error('Rate limit exceeded. Please try again later.');
        default:
          const errorMessage = data?.message || data?.errors?.[0]?.error || error.message;
          return new Error(`BambooHR API error (${status}): ${errorMessage}`);
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please try again.');
    }
    
    return new Error(`Network error: ${error.message}`);
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async getBuffer(endpoint: string, params?: Record<string, any>): Promise<Buffer> {
    try {
      const response: AxiosResponse<ArrayBuffer> = await this.client.get(endpoint, {
        params,
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async putDetailed<T = any>(endpoint: string, data?: any): Promise<BambooHRResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.put(endpoint, data);
      return {
        data: response.data,
        headers: response.headers as Record<string, string | string[] | undefined>,
        status: response.status,
      };
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

// Export a singleton instance
export const bambooClient = bambooConfig.apiToken && bambooConfig.baseUrl
  ? new BambooHRClient()
  : undefined;
