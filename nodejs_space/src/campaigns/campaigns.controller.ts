
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

  @Get('test-all-profiles')
  @ApiOperation({ summary: 'Test /sp/campaigns with all available profile IDs' })
  @ApiResponse({ status: 200, description: 'Returns test results for each profile' })
  async testAllProfiles() {
    try {
      this.logger.log('🧪 Testing all profiles for /sp/campaigns access...');
      
      // First, get all profiles
      const profiles = await this.amazonApi.get<any[]>('/v2/profiles');
      this.logger.log(`📋 Found ${profiles.length} profiles`);
      
      const results = [];
      
      for (const profile of profiles) {
        const profileId = profile.profileId;
        const countryCode = profile.countryCode;
        
        this.logger.log(`🔍 Testing Profile ID: ${profileId} (${countryCode})...`);
        
        try {
          // Temporarily override the profile ID for this request
          const originalEnv = process.env.AMAZON_PROFILE_ID;
          process.env.AMAZON_PROFILE_ID = String(profileId);
          
          const campaigns = await this.amazonApi.get<any[]>('/sp/campaigns');
          
          // Restore original env
          process.env.AMAZON_PROFILE_ID = originalEnv;
          
          results.push({
            profileId,
            countryCode,
            success: true,
            campaignCount: campaigns.length,
            message: `✅ SUCCESS - Found ${campaigns.length} campaigns`
          });
          
          this.logger.log(`✅ Profile ${profileId} (${countryCode}): ${campaigns.length} campaigns`);
        } catch (error) {
          // Restore original env
          const originalEnv = process.env.AMAZON_PROFILE_ID;
          process.env.AMAZON_PROFILE_ID = originalEnv;
          
          results.push({
            profileId,
            countryCode,
            success: false,
            error: error.response?.data || error.message,
            message: `❌ FAILED - ${error.response?.status || 'Unknown error'}`
          });
          
          this.logger.error(`❌ Profile ${profileId} (${countryCode}): ${error.response?.status}`);
        }
      }
      
      const successfulProfiles = results.filter(r => r.success);
      
      return {
        success: true,
        summary: {
          totalProfiles: profiles.length,
          successfulProfiles: successfulProfiles.length,
          failedProfiles: results.length - successfulProfiles.length
        },
        results,
        recommendation: successfulProfiles.length > 0 
          ? `Use Profile ID: ${successfulProfiles[0].profileId} (${successfulProfiles[0].countryCode})`
          : 'No profile has access to Sponsored Products campaigns'
      };
    } catch (error) {
      this.logger.error('Failed to test profiles:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
