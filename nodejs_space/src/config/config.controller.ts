
import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export class CredentialsDto {
  @ApiProperty({ example: 'amzn1.application-oa2-client.abc123', description: 'Amazon API Client ID' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: 'your_client_secret', description: 'Amazon API Client Secret' })
  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @ApiProperty({ example: 'Atzr|IwEBIA...', description: 'Amazon API Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@ApiTags('config')
@Controller('config')
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(
    private readonly amazonAuth: AmazonAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get system configuration status' })
  @ApiResponse({ status: 200, description: 'Returns system configuration status' })
  async getStatus() {
    const authStatus = this.amazonAuth.getConfigStatus();
    
    return {
      system: {
        status: authStatus.configured ? 'configured' : 'not_configured',
        environment: this.config.get<string>('nodeEnv'),
      },
      amazon: {
        configured: authStatus.configured,
        advertisingAccountId: authStatus.advertisingAccountId,
        marketplace: authStatus.marketplace,
        sellerId: authStatus.sellerId,
        hasValidToken: authStatus.hasValidToken,
        tokenExpiresAt: authStatus.tokenExpiresAt,
      },
      budget: {
        monthlyMin: this.config.get<number>('budget.monthlyMin'),
        monthlyMax: this.config.get<number>('budget.monthlyMax'),
      },
      acos: {
        targetMin: this.config.get<number>('acos.targetMin'),
        targetMax: this.config.get<number>('acos.targetMax'),
        pauseMin: this.config.get<number>('acos.pauseMin'),
        pauseMax: this.config.get<number>('acos.pauseMax'),
      },
    };
  }

  @Post('credentials')
  @ApiOperation({ 
    summary: 'Configure Amazon API credentials',
    description: 'Note: This endpoint currently requires manual .env file update. Use this to test credential validation.'
  })
  @ApiResponse({ status: 200, description: 'Credentials validation result' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async setCredentials(@Body() credentials: CredentialsDto) {
    // For security reasons, we don't allow runtime credential updates
    // Users must update the .env file manually
    
    return {
      message: 'Please update credentials in the .env file and restart the service',
      instructions: [
        '1. Open /home/ubuntu/amazon_ads_optimizer/nodejs_space/.env',
        '2. Update AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, and AMAZON_REFRESH_TOKEN',
        '3. Restart the service: yarn start:dev',
      ],
      currentStatus: this.amazonAuth.isConfigured() ? 'configured' : 'not_configured',
    };
  }

  @Get('test-credentials')
  @ApiOperation({ 
    summary: '🔍 TEST: Check loaded credentials (debug mode)',
    description: 'Shows the first/last characters of loaded credentials to verify they are loaded correctly from Railway environment variables.'
  })
  @ApiResponse({ status: 200, description: 'Returns masked credential info for debugging' })
  async testCredentials() {
    const clientId = this.config.get<string>('amazon.clientId');
    const clientSecret = this.config.get<string>('amazon.clientSecret');
    const refreshToken = this.config.get<string>('amazon.refreshToken');
    const profileId = this.config.get<string>('amazon.advertisingAccountId');
    const marketplace = this.config.get<string>('amazon.marketplace');

    const maskCredential = (value: string | undefined) => {
      if (!value || value.length < 10) return '❌ MISSING or TOO SHORT';
      return `${value.substring(0, 8)}...${value.substring(value.length - 8)} (length: ${value.length})`;
    };

    return {
      message: '🔍 Credential Debug Info',
      timestamp: new Date().toISOString(),
      credentials: {
        clientId: maskCredential(clientId),
        clientSecret: maskCredential(clientSecret),
        refreshToken: maskCredential(refreshToken),
        profileId: profileId || '❌ MISSING',
        marketplace: marketplace || '❌ MISSING',
      },
      allPresent: !!(clientId && clientSecret && refreshToken && profileId),
      tokenEndpoint: this.config.get<string>('amazon.tokenEndpoint'),
      apiEndpoint: this.config.get<string>('amazon.apiEndpoint'),
    };
  }

  @Post('test-token-refresh')
  @ApiOperation({ 
    summary: '🧪 TEST: Attempt to refresh Amazon access token',
    description: 'Tests the token refresh flow and returns detailed error information if it fails.'
  })
  @ApiResponse({ status: 200, description: 'Token refresh test result' })
  async testTokenRefresh() {
    try {
      const accessToken = await this.amazonAuth.getAccessToken();
      
      return {
        success: true,
        message: '✅ Token refresh successful!',
        tokenPreview: `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`,
        tokenLength: accessToken.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Token refresh failed',
        error: error.message,
        details: error.response?.data || 'No additional details',
        statusCode: error.response?.status,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('list-profiles')
  @ApiOperation({ 
    summary: '📋 LIST: Get all available Amazon Advertising Profiles',
    description: 'Fetches all advertising profiles associated with your Amazon account to find the correct Profile ID.'
  })
  @ApiResponse({ status: 200, description: 'Returns list of all available advertising profiles' })
  async listProfiles() {
    try {
      const profiles = await this.amazonAuth.getProfiles();
      
      return {
        success: true,
        message: '✅ Profiles fetched successfully!',
        count: profiles.length,
        profiles: profiles.map(p => ({
          profileId: p.profileId,
          accountInfo: p.accountInfo,
          countryCode: p.countryCode,
          currencyCode: p.currencyCode,
          timezone: p.timezone,
          accountType: p.accountType,
        })),
        currentProfileId: this.config.get<string>('amazon.advertisingAccountId'),
        hint: 'Update AMAZON_PROFILE_ID in Railway with the correct profileId from the list above',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to fetch profiles',
        error: error.message,
        details: error.response?.data || 'No additional details',
        statusCode: error.response?.status,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-all-profiles')
  @ApiOperation({ 
    summary: '🧪 TEST: Test API access with all available Profile IDs',
    description: 'Tests /sp/campaigns endpoint with each profile ID to find which one works'
  })
  @ApiResponse({ status: 200, description: 'Returns test results for each profile ID' })
  async testAllProfiles() {
    try {
      const profiles = await this.amazonAuth.getProfiles();
      const accountId = this.config.get<string>('amazon.advertisingAccountId');
      const currentProfileId = this.config.get<string>('amazon.profileId');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = this.config.get<string>('amazon.clientId');
      
      const results = [];

      this.logger.log('🧪 Testing API access with different IDs...');

      // Test with Account ID
      if (accountId) {
        this.logger.log(`Testing Account ID: ${accountId}`);
        try {
          const response = await axios.get(
            'https://advertising-api-eu.amazon.com/sp/campaigns',
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': accountId,
              },
            },
          );
          results.push({ id: accountId, type: 'Account ID', status: '✅ SUCCESS', campaigns: response.data.length });
        } catch (error) {
          results.push({ 
            id: accountId, 
            type: 'Account ID', 
            status: '❌ FAILED', 
            error: error.response?.data?.details || error.response?.data || error.message 
          });
        }
      }

      // Test each profile from the list
      for (const profile of profiles) {
        this.logger.log(`Testing Profile ID: ${profile.profileId} (${profile.countryCode})`);
        try {
          const response = await axios.get(
            'https://advertising-api-eu.amazon.com/sp/campaigns',
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': profile.profileId.toString(),
              },
            },
          );
          results.push({ 
            id: profile.profileId, 
            type: `Profile (${profile.countryCode})`, 
            status: '✅ SUCCESS', 
            campaigns: response.data.length,
            isCurrent: profile.profileId.toString() === currentProfileId,
          });
        } catch (error) {
          results.push({ 
            id: profile.profileId, 
            type: `Profile (${profile.countryCode})`, 
            status: '❌ FAILED', 
            error: error.response?.data?.details || error.response?.data || error.message,
            isCurrent: profile.profileId.toString() === currentProfileId,
          });
        }
      }

      const workingId = results.find(r => r.status === '✅ SUCCESS');

      return {
        success: true,
        message: '🧪 Profile access test completed',
        tested: results.length,
        results,
        recommendation: workingId 
          ? `✅ Working ID found: ${workingId.id} (${workingId.type}) - Set this as AMAZON_PROFILE_ID in Railway!` 
          : '❌ No working profile/account ID found. Your refresh token may not have the correct API scopes.',
        currentSettings: {
          AMAZON_PROFILE_ID: currentProfileId || 'NOT SET',
          AMAZON_ADVERTISING_API_SCOPE: accountId || 'NOT SET',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to test profile access', error);
      return {
        success: false,
        message: '❌ Failed to test profile access',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
