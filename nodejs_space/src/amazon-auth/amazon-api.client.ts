
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
  private profileId: string | null = null; // Cache profile ID

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AmazonAuthService,
  ) {
    const apiEndpoint = this.configService.get<string>('amazon.apiEndpoint');
    const clientId = this.configService.get<string>('amazon.clientId');
    const accountId = this.configService.get<string>('amazon.advertisingAccountId');
    const profileId = this.configService.get<string>('amazon.profileId');

    this.logger.log(`🔧 Amazon API Client initialized (${apiEndpoint})`);

    if (!clientId) {
      this.logger.error('❌ AMAZON_CLIENT_ID is not set!');
    }
    if (!accountId) {
      this.logger.error('❌ AMAZON_ADVERTISING_ACCOUNT_ID is not set!');
    }

    this.axiosInstance = axios.create({
      baseURL: apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Amazon-Advertising-API-ClientId': clientId,
      },
    });

    // Request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Rate limiting
        await this.enforceRateLimit();

        // Add access token
        const accessToken = await this.authService.getAccessToken();
        
        if (!accessToken) {
          this.logger.error('❌ Access Token is empty!');
          throw new Error('No access token available');
        }
        
        config.headers.Authorization = `Bearer ${accessToken}`;

        // Get and add Amazon-Advertising-API-Scope (Profile ID or Account ID)
        if (!config.url?.includes('/v2/profiles')) {
          // Try Profile ID first (required for most SP endpoints)
          const profileId = this.configService.get<string>('amazon.profileId');
          const accountId = this.configService.get<string>('amazon.advertisingAccountId');
          
          if (profileId) {
            config.headers['Amazon-Advertising-API-Scope'] = profileId;
          } else if (accountId) {
            config.headers['Amazon-Advertising-API-Scope'] = accountId;
          } else {
            this.logger.error('❌ Neither AMAZON_PROFILE_ID nor AMAZON_ADVERTISING_ACCOUNT_ID is set!');
          }
        }

        // Only log the request method and URL (no verbose headers)
        this.logger.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
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
        // Only log if not successful (reduce log spam)
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const errorMessage = error.response?.data?.message || error.response?.data?.details || error.message;

        // Consolidated error logging (one line per error)
        this.logger.error(`❌ ${status} ${url} - ${errorMessage}`);

        if (status === 429) {
          await this.sleep(60000);
          return this.axiosInstance.request(error.config);
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
   * Get Profile ID from Amazon (cached after first call)
   */
  private async getProfileId(): Promise<string | null> {
    // Return cached profile ID if available
    if (this.profileId) {
      return this.profileId;
    }

    try {
      this.logger.log('🔍 Fetching Profile ID from Amazon...');
      
      // Get access token
      const accessToken = await this.authService.getAccessToken();
      const clientId = this.configService.get<string>('amazon.clientId');
      const apiEndpoint = this.configService.get<string>('amazon.apiEndpoint');

      // Make direct request to /v2/profiles (without interceptor to avoid infinite loop)
      const response = await axios.get(`${apiEndpoint}/v2/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      });

      const profiles = response.data;
      this.logger.log(`📋 Found ${profiles.length} profile(s)`);

      if (profiles.length === 0) {
        this.logger.error('❌ No profiles found for this account');
        return null;
      }

      // Use the first profile (or filter by accountId if needed)
      const accountId = this.configService.get<string>('amazon.advertisingAccountId');
      let selectedProfile = profiles[0];

      // Try to find profile matching account ID
      if (accountId) {
        const matchingProfile = profiles.find((p: any) => p.accountInfo?.id === accountId);
        if (matchingProfile) {
          selectedProfile = matchingProfile;
          this.logger.log(`✅ Found profile matching Account ID: ${accountId}`);
        }
      }

      this.profileId = selectedProfile.profileId.toString();
      this.logger.log(`✅ Using Profile ID: ${this.profileId}`);
      this.logger.log(`   - Profile Name: ${selectedProfile.accountInfo?.name || 'N/A'}`);
      this.logger.log(`   - Marketplace: ${selectedProfile.countryCode}`);
      this.logger.log(`   - Type: ${selectedProfile.accountInfo?.type || 'N/A'}`);

      return this.profileId;
    } catch (error) {
      this.logger.error('❌ Failed to fetch Profile ID', error.response?.data || error.message);
      return null;
    }
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
