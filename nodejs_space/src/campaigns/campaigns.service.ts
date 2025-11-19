
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
import axios from 'axios';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly amazonApiUrl = 'https://advertising-api-eu.amazon.com';
  private campaignsCache: any[] = [];
  private cacheExpiry: Date | null = null;

  constructor(
    private configService: ConfigService,
    private amazonAuthService: AmazonAuthService,
  ) {}

  async getAllCampaigns(): Promise<any[]> {
    // Return cached campaigns if valid
    if (this.campaignsCache.length > 0 && this.cacheExpiry && new Date() < this.cacheExpiry) {
      this.logger.log('✅ Returning cached campaigns');
      return this.campaignsCache;
    }

    this.logger.log('📥 Fetching campaigns from Amazon API...');

    try {
      const accessToken = await this.amazonAuthService.getAccessToken();
      const apiScope = this.configService.get<string>('AMAZON_ADVERTISING_API_SCOPE');
      
      if (!apiScope) {
        throw new Error('AMAZON_ADVERTISING_API_SCOPE not configured');
      }

      this.logger.log(`🎯 Using API Scope: ${apiScope.substring(0, 30)}...`);

      const response = await axios.get(`${this.amazonApiUrl}/sp/campaigns`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': this.configService.get<string>('AMAZON_CLIENT_ID'),
          'Amazon-Advertising-API-Scope': apiScope,
          'Content-Type': 'application/json',
        },
      });

      this.campaignsCache = response.data;
      this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes cache

      this.logger.log(`✅ Successfully fetched ${this.campaignsCache.length} campaigns`);
      return this.campaignsCache;
    } catch (error) {
      this.logger.error(`❌ API Error (${error.response?.status}) - /sp/campaigns`);
      this.logger.error(`   Details: ${error.response?.data?.details || error.message}`);
      
      return {
        success: false,
        error: error.message,
        campaigns: [],
        hint: 'Check your Amazon API credentials and AMAZON_ADVERTISING_API_SCOPE in Railway',
      } as any;
    }
  }

  async getCampaignById(id: string): Promise<any> {
    const campaigns = await this.getAllCampaigns();
    return campaigns.find((c: any) => c.campaignId === id);
  }
}
