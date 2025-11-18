
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

@ApiTags('keywords')
@Controller('keywords')
export class KeywordsController {
  private readonly logger = new Logger(KeywordsController.name);

  constructor(private readonly amazonApi: AmazonApiClient) {}

  @Get()
  @ApiOperation({ summary: 'Get all keywords from Amazon Ads API' })
  @ApiResponse({ status: 200, description: 'Returns all keywords directly from Amazon' })
  async findAll() {
    try {
      this.logger.log('📊 Fetching keywords from Amazon API...');
      
      // Fetch keywords directly from Amazon API
      const keywords = await this.amazonApi.get<any[]>('/sp/keywords');
      
      this.logger.log(`✅ Found ${keywords.length} keywords`);
      
      return {
        success: true,
        count: keywords.length,
        keywords: keywords,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'Amazon Advertising API v3',
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
