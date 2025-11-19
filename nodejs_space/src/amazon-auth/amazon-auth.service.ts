
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AmazonAuthService {
  private readonly logger = new Logger(AmazonAuthService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      this.logger.log('✅ Using cached access token');
      return this.accessToken;
    }

    // Otherwise, refresh the token
    this.logger.log('🔄 Refreshing access token...');
    await this.refreshAccessToken();
    return this.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    const clientId = this.configService.get<string>('AMAZON_CLIENT_ID');
    const clientSecret = this.configService.get<string>('AMAZON_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('AMAZON_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Amazon API credentials in environment variables');
    }

    try {
      // Create Basic Auth header
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      this.logger.log('📤 Sending token refresh request to Amazon...');
      this.logger.log(`   Authorization: Bearer ${basicAuth.substring(0, 20)}...`);

      const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(`✅ Access token refreshed successfully`);
      this.logger.log(`   Token expires at: ${this.tokenExpiry.toISOString()}`);
    } catch (error) {
      this.logger.error('❌ Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Amazon API access token');
    }
  }
}
