
import { Controller, Get, Param, Post, Put, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(private readonly amazonApi: AmazonApiClient) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns from Amazon Ads API' })
  @ApiResponse({ status: 200, description: 'Returns all campaigns directly from Amazon' })
  async findAll() {
    try {
      this.logger.log('📊 Fetching campaigns from Amazon API...');
      
      // Fetch campaigns directly from Amazon API (v3)
      const campaigns = await this.amazonApi.get<any[]>('/sp/campaigns');
      
      this.logger.log(`✅ Found ${campaigns.length} campaigns`);
      
      return {
        success: true,
        count: campaigns.length,
        campaigns: campaigns,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'Amazon Advertising API v3',
          note: 'Data fetched directly from Amazon (no database)'
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch campaigns:', error.message);
      return {
        success: false,
        error: error.message,
        campaigns: [],
        hint: 'Check your Amazon API credentials and AMAZON_PROFILE_ID in Railway environment variables'
      };
    }
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get a single campaign by Amazon campaign ID' })
  @ApiParam({ name: 'campaignId', description: 'Amazon campaign ID' })
  @ApiResponse({ status: 200, description: 'Returns campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('campaignId') campaignId: string) {
    try {
      this.logger.log(`📊 Fetching campaign ${campaignId}...`);
      const campaign = await this.amazonApi.get<any>(`/sp/campaigns/${campaignId}`);
      
      return {
        success: true,
        campaign,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Failed to fetch campaign ${campaignId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Put(':campaignId')
  @ApiOperation({ summary: 'Update a campaign on Amazon' })
  @ApiParam({ name: 'campaignId', description: 'Amazon campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  async updateCampaign(
    @Param('campaignId') campaignId: string,
    @Body() updates: { state?: string; budget?: number },
  ) {
    try {
      this.logger.log(`📝 Updating campaign ${campaignId}...`);
      
      const amazonUpdates: any = {};
      if (updates.state) {
        amazonUpdates.state = updates.state;
      }
      if (updates.budget) {
        amazonUpdates.budget = {
          budget: updates.budget,
          budgetType: 'DAILY'
        };
      }

      const result = await this.amazonApi.put(`/sp/campaigns/${campaignId}`, amazonUpdates);
      
      this.logger.log(`✅ Campaign ${campaignId} updated successfully`);
      
      return {
        success: true,
        message: 'Campaign updated successfully',
        result
      };
    } catch (error) {
      this.logger.error(`Failed to update campaign ${campaignId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
