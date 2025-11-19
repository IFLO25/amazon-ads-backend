
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';

@ApiTags('debug')
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(private readonly amazonAuth: AmazonAuthService) {}

  @Get('token-test')
  @ApiOperation({ summary: 'Test if access token is valid and show token details' })
  @ApiResponse({ status: 200, description: 'Returns token test results' })
  async testToken() {
    try {
      const axios = require('axios');
      
      // Get the access token
      let accessToken;
      let tokenError = null;
      try {
        accessToken = await this.amazonAuth.getAccessToken();
      } catch (error) {
        tokenError = error.message;
      }
      
      const clientId = process.env.AMAZON_CLIENT_ID;
      const profileId = process.env.AMAZON_PROFILE_ID;
      
      // Test 1: Can we get profiles?
      let profilesTest = null;
      try {
        const response = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json'
          }
        });
        profilesTest = {
          success: true,
          profileCount: response.data.length,
          profiles: response.data.map(p => ({
            profileId: p.profileId,
            countryCode: p.countryCode,
            type: p.type
          }))
        };
      } catch (error) {
        profilesTest = {
          success: false,
          status: error.response?.status,
          error: error.response?.data,
          fullError: error.message
        };
      }
      
      // Test 2: Can we get campaigns with current profile?
      let campaignsTest = null;
      try {
        const response = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': String(profileId),
            'Content-Type': 'application/json'
          }
        });
        campaignsTest = {
          success: true,
          campaignCount: response.data.length
        };
      } catch (error) {
        campaignsTest = {
          success: false,
          status: error.response?.status,
          error: error.response?.data,
          fullError: error.message
        };
      }
      
      return {
        tokenStatus: {
          hasToken: !!accessToken,
          tokenLength: accessToken?.length || 0,
          tokenError: tokenError,
          tokenPreview: accessToken ? accessToken.substring(0, 30) + '...' : null
        },
        config: {
          clientId: clientId.substring(0, 20) + '...',
          profileId: profileId,
          refreshToken: process.env.AMAZON_REFRESH_TOKEN ? 'Set (length: ' + process.env.AMAZON_REFRESH_TOKEN.length + ')' : 'Not set'
        },
        tests: {
          profilesEndpoint: profilesTest,
          campaignsEndpoint: campaignsTest
        },
        conclusion: profilesTest?.success 
          ? 'Token is valid - Profile ID or permissions issue'
          : 'Token is invalid or expired - Need new refresh token'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  @Get('test-all-profiles')
  @ApiOperation({ summary: 'Test /sp/campaigns with all available profile IDs' })
  @ApiResponse({ status: 200, description: 'Returns test results for each profile' })
  async testAllProfiles() {
    try {
      this.logger.log('🧪 Testing all profiles for /sp/campaigns access...');
      
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      
      // Get all profiles
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
          const response = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': String(profileId),
              'Content-Type': 'application/json'
            }
          });
          
          results.push({
            profileId,
            countryCode,
            success: true,
            campaignCount: response.data.length,
            message: `✅ SUCCESS - Found ${response.data.length} campaigns`
          });
          
          this.logger.log(`✅ Profile ${profileId} (${countryCode}): ${response.data.length} campaigns`);
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
}
