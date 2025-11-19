
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';

@ApiTags('keywords')
@Controller('keywords')
export class KeywordsController {
  private readonly logger = new Logger(KeywordsController.name);

  constructor(
    private readonly amazonApi: AmazonApiClient,
    private readonly amazonAuth: AmazonAuthService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all keywords from Amazon Ads API' })
  @ApiResponse({ status: 200, description: 'Returns all keywords directly from Amazon' })
  async findAll() {
    try {
      this.logger.log('📊 Fetching keywords from Amazon API...');
      
      // Use axios directly to test all endpoint variants
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      const profileId = process.env.AMAZON_PROFILE_ID;
      
      const endpointsToTry = [
        { url: 'https://advertising-api-eu.amazon.com/v3/sp/keywords', name: 'v3: /v3/sp/keywords' },
        { url: 'https://advertising-api-eu.amazon.com/sp/keywords', name: 'v3: /sp/keywords' },
        { url: 'https://advertising-api-eu.amazon.com/v2/sp/keywords', name: 'v2: /v2/sp/keywords' }
      ];
      
      let keywords = null;
      let successEndpoint = null;
      
      for (const testEndpoint of endpointsToTry) {
        try {
          this.logger.log(`🧪 Testing: ${testEndpoint.name}`);
          
          const response = await axios.get(testEndpoint.url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': String(profileId),
              'Content-Type': 'application/json'
            }
          });
          
          keywords = response.data;
          successEndpoint = testEndpoint.name;
          this.logger.log(`✅ SUCCESS with ${testEndpoint.name}!`);
          break;
        } catch (err) {
          this.logger.warn(`❌ ${testEndpoint.name} failed: ${err.response?.status}`);
        }
      }
      
      if (!keywords) {
        throw new Error('All endpoints failed');
      }
      
      this.logger.log(`✅ Found ${keywords.length} keywords using ${successEndpoint}`);
      
      return {
        success: true,
        count: keywords.length,
        keywords: keywords,
        metadata: {
          timestamp: new Date().toISOString(),
          endpoint: successEndpoint,
          note: 'Data fetched directly from Amazon (no database)'
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch keywords:', error.message);
      return {
        success: false,
        error: error.message,
        keywords: [],
        hint: 'Check your Amazon API credentials'
      };
    }
  }
}
