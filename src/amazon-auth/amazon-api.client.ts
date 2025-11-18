
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmazonAuthService } from './amazon-auth.service';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class AmazonApiClient {
  private readonly logger = new Logger(AmazonApiClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly maxRequestsPerMinute = 60;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AmazonAuthService,
  ) {
    const apiEndpoint = this.configService.get<string>('amazon.apiEndpoint');

    this.axiosInstance = axios.create({
      baseURL: apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Amazon-Advertising-API-ClientId': this.configService.get<string>('amazon.clientId'),
      },
    });

    // Request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Rate limiting
        await this.enforceRateLimit();

        // Add access token
        const accessToken = await this.authService.getAccessToken();
        config.headers.Authorization = `Bearer ${accessToken}`;

        // Add advertising account ID header
        const accountId = this.configService.get<string>('amazon.advertisingAccountId');
        config.headers['Amazon-Advertising-API-Scope'] = accountId;

        this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;

        if (status === 401) {
          this.logger.error('Unauthorized - token may be invalid', url);
        } else if (status === 429) {
          this.logger.warn('Rate limit exceeded, waiting 60 seconds...', url);
          await this.sleep(60000);
          return this.axiosInstance.request(error.config);
        } else if (status >= 500) {
          this.logger.error(`Server error (${status})`, url, error.response?.data);
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter every minute
    if (timeSinceLastRequest > 60000) {
      this.requestCount = 0;
    }

    // Check if we exceeded max requests per minute
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceLastRequest;
      this.logger.warn(`Rate limit approaching, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.requestCount = 0;
    }

    // Ensure minimum delay between requests
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request to Amazon Advertising API
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request to Amazon Advertising API
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request to Amazon Advertising API
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request to Amazon Advertising API
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get campaigns with optional state filter
   */
  async getCampaigns(stateFilter?: string): Promise<any[]> {
    let url = '/sp/campaigns';
    if (stateFilter) {
      url += `?stateFilter=${stateFilter}`;
    }
    return this.get<any[]>(url);
  }
}
