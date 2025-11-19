
import { Controller, Get, Param, Post, Put, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(
    private readonly amazonApi: AmazonApiClient,
    private readonly amazonAuth: AmazonAuthService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns from Amazon Ads API' })
  @ApiResponse({ status: 200, description: 'Returns all campaigns directly from Amazon' })
  async findAll() {
    try {
      this.logger.log('📊 Fetching campaigns from Amazon API...');
      
      // Use axios directly like the working code
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      const profileId = process.env.AMAZON_PROFILE_ID;
      
      // Try multiple endpoints (including "spcampaigns" as one word)
      const endpointsToTry = [
        { url: 'https://advertising-api-eu.amazon.com/spcampaigns', name: '/spcampaigns' },
        { url: 'https://advertising-api-eu.amazon.com/v2/spcampaigns', name: 'v2: /v2/spcampaigns' },
        { url: 'https://advertising-api-eu.amazon.com/v3/spcampaigns', name: 'v3: /v3/spcampaigns' },
        { url: 'https://advertising-api-eu.amazon.com/sp/campaigns', name: '/sp/campaigns' },
        { url: 'https://advertising-api-eu.amazon.com/v2/sp/campaigns', name: 'v2: /v2/sp/campaigns' },
        { url: 'https://advertising-api-eu.amazon.com/v3/sp/campaigns', name: 'v3: /v3/sp/campaigns' }
      ];
      
      let campaigns = null;
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
          
          campaigns = response.data;
          successEndpoint = testEndpoint.name;
          this.logger.log(`✅ SUCCESS with ${testEndpoint.name}!`);
          break;
        } catch (err) {
          this.logger.warn(`❌ ${testEndpoint.name} failed: ${err.response?.status}`);
        }
      }
      
      if (!campaigns) {
        throw new Error('All endpoints failed');
      }
      
      this.logger.log(`✅ Found ${campaigns.length} campaigns using ${successEndpoint}`);
      
      return {
        success: true,
        count: campaigns.length,
        campaigns: campaigns,
        metadata: {
          timestamp: new Date().toISOString(),
          endpoint: successEndpoint,
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

  @Get('debug-profiles')
  @ApiOperation({ summary: 'Show all profile details with exact error messages' })
  @ApiResponse({ status: 200, description: 'Returns detailed profile information' })
  async debugProfiles() {
    try {
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      const currentProfileId = process.env.AMAZON_PROFILE_ID;
      
      // Get all profiles
      const profilesResponse = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json'
        }
      });
      
      const profiles = profilesResponse.data;
      
      // Test current profile ID
      let currentProfileTest = null;
      try {
        const response = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': String(currentProfileId),
            'Content-Type': 'application/json'
          }
        });
        currentProfileTest = {
          success: true,
          campaignCount: response.data.length
        };
      } catch (error) {
        currentProfileTest = {
          success: false,
          status: error.response?.status,
          errorCode: error.response?.data?.code,
          errorMessage: error.response?.data?.details || error.response?.data?.message || error.message,
          fullError: error.response?.data
        };
      }
      
      return {
        currentConfig: {
          profileId: currentProfileId,
          clientId: clientId.substring(0, 20) + '...',
          tokenLength: accessToken.length
        },
        currentProfileTest,
        allProfiles: profiles.map(p => ({
          profileId: p.profileId,
          countryCode: p.countryCode,
          marketplace: p.marketplace,
          accountInfo: p.accountInfo,
          type: p.type
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fullError: error.response?.data
      };
    }
  }

  @Get('test-all-profiles')
  @ApiOperation({ summary: 'Test /sp/campaigns with all available profile IDs' })
  @ApiResponse({ status: 200, description: 'Returns test results for each profile' })
  async testAllProfiles() {
    try {
      this.logger.log('🧪 Testing all profiles for /sp/campaigns access...');
      
      // Use axios directly to avoid any ConfigService issues
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      
      this.logger.log(`🔑 Access Token length: ${accessToken.length}`);
      this.logger.log(`🔑 Client ID: ${clientId}`);
      
      // First, get all profiles using direct axios call
      const profilesResponse = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json'
        }
      });
      
      const profiles = profilesResponse.data;
      this.logger.log(`📋 Found ${profiles.length} profiles`);
      
      const results = [];
      
      for (const profile of profiles) {
        const profileId = profile.profileId;
        const countryCode = profile.countryCode;
        
        this.logger.log(`🔍 Testing Profile ID: ${profileId} (${countryCode})...`);
        
        try {
          // Try MULTIPLE endpoint variations
          let campaigns = null;
          let endpoint = null;
          
          const endpointsToTry = [
            { url: 'https://advertising-api-eu.amazon.com/spcampaigns', name: '/spcampaigns' },
            { url: 'https://advertising-api-eu.amazon.com/v2/spcampaigns', name: 'v2: /v2/spcampaigns' },
            { url: 'https://advertising-api-eu.amazon.com/v3/spcampaigns', name: 'v3: /v3/spcampaigns' },
            { url: 'https://advertising-api-eu.amazon.com/sp/campaigns', name: '/sp/campaigns' },
            { url: 'https://advertising-api-eu.amazon.com/v2/sp/campaigns', name: 'v2: /v2/sp/campaigns' },
            { url: 'https://advertising-api-eu.amazon.com/v3/sp/campaigns', name: 'v3: /v3/sp/campaigns' },
            { url: 'https://advertising-api-eu.amazon.com/sb/campaigns', name: 'sb: /sb/campaigns' }
          ];
          
          for (const testEndpoint of endpointsToTry) {
            try {
              const response = await axios.get(testEndpoint.url, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Amazon-Advertising-API-ClientId': clientId,
                  'Amazon-Advertising-API-Scope': String(profileId),
                  'Content-Type': 'application/json'
                }
              });
              campaigns = response.data;
              endpoint = testEndpoint.name;
              break; // Success! Stop trying
            } catch (err) {
              // Try next endpoint
              continue;
            }
          }
          
          if (!campaigns) {
            throw new Error('All endpoints failed');
          }
          
          results.push({
            profileId,
            countryCode,
            success: true,
            endpoint,
            campaignCount: campaigns.length,
            message: `✅ SUCCESS (${endpoint}) - Found ${campaigns.length} campaigns`
          });
          
          this.logger.log(`✅ Profile ${profileId} (${countryCode}): ${campaigns.length} campaigns using ${endpoint}`);
        } catch (error) {
          const errorStatus = error.response?.status || 'No status';
          const errorMessage = error.response?.data?.details || error.response?.data?.message || error.message;
          
          results.push({
            profileId,
            countryCode,
            success: false,
            status: errorStatus,
            error: error.response?.data || errorMessage,
            message: `❌ FAILED - ${errorStatus}: ${errorMessage}`
          });
          
          this.logger.error(`❌ Profile ${profileId} (${countryCode}): ${errorStatus} - ${errorMessage}`);
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

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get a single campaign by Amazon campaign ID' })
  @ApiParam({ name: 'campaignId', description: 'Amazon campaign ID' })
  @ApiResponse({ status: 200, description: 'Returns campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('campaignId') campaignId: string) {
    try {
      this.logger.log(`📊 Fetching campaign ${campaignId}...`);
      
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      const profileId = process.env.AMAZON_PROFILE_ID;
      
      const endpointsToTry = [
        `https://advertising-api-eu.amazon.com/spcampaigns/${campaignId}`,
        `https://advertising-api-eu.amazon.com/v2/spcampaigns/${campaignId}`,
        `https://advertising-api-eu.amazon.com/v3/spcampaigns/${campaignId}`,
        `https://advertising-api-eu.amazon.com/sp/campaigns/${campaignId}`,
        `https://advertising-api-eu.amazon.com/v2/sp/campaigns/${campaignId}`,
        `https://advertising-api-eu.amazon.com/v3/sp/campaigns/${campaignId}`
      ];
      
      let campaign = null;
      
      for (const url of endpointsToTry) {
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': String(profileId),
              'Content-Type': 'application/json'
            }
          });
          campaign = response.data;
          break;
        } catch (err) {
          continue;
        }
      }
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
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
