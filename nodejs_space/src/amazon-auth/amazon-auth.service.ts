
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AmazonAuthService {
  private readonly logger = new Logger(AmazonAuthService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get Amazon Advertising profiles
   */
  async getProfiles(): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('amazon.clientId');
    
    try {
      const response = await axios.get(
        'https://advertising-api-eu.amazon.com/v2/profiles',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        },
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch profiles', error.response?.data || error.message);
      throw new Error('Failed to fetch profiles');
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token in memory
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken as string;
    }

    // Check database for stored token
    const storedToken = await this.getStoredToken();
    if (storedToken && new Date() < storedToken.expiresAt) {
      this.accessToken = storedToken.accessToken;
      this.tokenExpiresAt = storedToken.expiresAt;
      this.logger.log('Using stored access token from database');
      return this.accessToken as string;
    }

    // Refresh token
    this.logger.log('Access token expired or missing, refreshing...');
    return await this.refreshAccessToken();
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('amazon.clientId');
    const clientSecret = this.configService.get<string>('amazon.clientSecret');
    const refreshToken = this.configService.get<string>('amazon.refreshToken');
    const tokenEndpoint = this.configService.get<string>('amazon.tokenEndpoint');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Amazon API credentials not configured. Please set AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, and AMAZON_REFRESH_TOKEN in .env file',
      );
    }

    try {
      const response = await axios.post<TokenResponse>(
        tokenEndpoint!,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data as TokenResponse;
      const { access_token: accessToken, expires_in, refresh_token: newRefreshToken } = data;

      // Calculate expiration time (subtract 5 minutes for safety margin)
      const expiresAt = new Date(Date.now() + (expires_in - 300) * 1000);

      // Store in memory
      this.accessToken = accessToken;
      this.tokenExpiresAt = expiresAt;

      // Store in database
      await this.storeToken(accessToken, newRefreshToken || refreshToken, expiresAt);

      this.logger.log('Access token refreshed successfully');
      return accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh access token', error.response?.data || error.message);
      throw new Error('Failed to refresh Amazon access token');
    }
  }

  /**
   * Get stored token from database
   */
  private async getStoredToken() {
    const tokens = await this.prisma.tokenStorage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return tokens.length > 0 ? tokens[0] : null;
  }

  /**
   * Store token in database
   */
  private async storeToken(accessToken: string, refreshToken: string, expiresAt: Date) {
    // Delete old tokens
    await this.prisma.tokenStorage.deleteMany({});

    // Store new token
    await this.prisma.tokenStorage.create({
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt,
      },
    });
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    const clientId = this.configService.get<string>('amazon.clientId');
    const clientSecret = this.configService.get<string>('amazon.clientSecret');
    const refreshToken = this.configService.get<string>('amazon.refreshToken');

    return !!(
      clientId &&
      clientSecret &&
      refreshToken &&
      clientId !== 'your_client_id_here' &&
      clientSecret !== 'your_client_secret_here' &&
      refreshToken !== 'your_refreshToken_here'
    );
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.logger.log('Successfully exchanged code for tokens');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get configuration status
   */
  getConfigStatus() {
    const isConfigured = this.isConfigured();
    const advertisingAccountId = this.configService.get<string>('amazon.advertisingAccountId');
    const marketplace = this.configService.get<string>('amazon.marketplace');
    const sellerId = this.configService.get<string>('amazon.sellerId');

    return {
      configured: isConfigured,
      advertisingAccountId,
      marketplace,
      sellerId,
      hasValidToken: !!this.accessToken && !!this.tokenExpiresAt && new Date() < this.tokenExpiresAt,
      tokenExpiresAt: this.tokenExpiresAt,
    };
  }
}
