
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

    this.logger.log('🔧 Initializing Amazon API Client...');
    this.logger.log(`   - API Endpoint: ${apiEndpoint}`);
    this.logger.log(`   - Client ID: ${clientId ? clientId.substring(0, 10) + '...' : '❌ MISSING'}`);
    this.logger.log(`   - API Scope (from env): ${accountId ? accountId : '❌ MISSING'}`);
    
    // Log the actual environment variables to debug
    this.logger.log('🔍 Environment Variables Debug:');
    this.logger.log(`   - AMAZON_ADVERTISING_API_SCOPE: ${process.env.AMAZON_ADVERTISING_API_SCOPE ? '✅ SET' : '❌ MISSING'}`);
    this.logger.log(`   - AMAZON_ADVERTISING_ACCOUNT_ID: ${process.env.AMAZON_ADVERTISING_ACCOUNT_ID ? '✅ SET' : '❌ MISSING'}`);

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
        
        this.logger.log(`🔐 Access Token for request: ${accessToken ? accessToken.substring(0, 30) + '...' : '❌ EMPTY/UNDEFINED'}`);
        
        if (!accessToken) {
          this.logger.error('❌ CRITICAL: Access Token is empty or undefined!');
          throw new Error('No access token available');
        }
        
        config.headers.Authorization = `Bearer ${accessToken}`;
        this.logger.log(`📝 Authorization Header: Bearer ${accessToken.substring(0, 30)}...`);

        // Get and add Amazon-Advertising-API-Scope (Account ID or Profile ID)
        if (!config.url?.includes('/v2/profiles')) {
          // Use Account ID directly from environment variables
          const apiScope = this.configService.get<string>('amazon.advertisingAccountId');
          if (apiScope) {
            config.headers['Amazon-Advertising-API-Scope'] = apiScope;
            this.logger.log(`🎯 Using API Scope (Account ID): ${apiScope}`);
          } else {
            this.logger.error('❌ AMAZON_ADVERTISING_ACCOUNT_ID not set!');
          }
        }

        this.logger.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        this.logger.log(`   Headers: ClientId=${config.headers['Amazon-Advertising-API-ClientId'] ? 'SET' : 'MISSING'}, Scope=${config.headers['Amazon-Advertising-API-Scope'] || 'MISSING'}`);
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
        this.logger.debug(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const errorData = error.response?.data;

        if (status === 401) {
          this.logger.error(`❌ Unauthorized (401) - ${url}`);
          this.logger.error('   Token may be invalid or expired');
        } else if (status === 429) {
          this.logger.warn(`⚠️ Rate limit exceeded (429) - ${url}`);
          this.logger.warn('   Waiting 60 seconds before retry...');
          await this.sleep(60000);
          return this.axiosInstance.request(error.config);
        } else if (status >= 500) {
          this.logger.error(`❌ Server error (${status}) - ${url}`);
          this.logger.error(`   Response: ${JSON.stringify(errorData)}`);
        } else if (status) {
          this.logger.error(`❌ API Error (${status}) - ${url}`);
          this.logger.error(`   Details: ${JSON.stringify(errorData)}`);
        } else {
          this.logger.error(`❌ Network/Unknown error - ${url}`);
          this.logger.error(`   ${error.message}`);
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
