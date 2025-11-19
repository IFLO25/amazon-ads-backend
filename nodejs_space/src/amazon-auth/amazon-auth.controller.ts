import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AmazonAuthService } from './amazon-auth.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Amazon Auth')
@Controller('auth')
export class AmazonAuthController {
  constructor(private readonly amazonAuthService: AmazonAuthService) {}

  @Post('exchange-code')
  @ApiOperation({ 
    summary: 'Exchange authorization code for refresh token',
    description: 'Converts an Amazon OAuth authorization code into a refresh token and saves it to .env'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code from Amazon OAuth' },
        clientId: { type: 'string', description: 'Amazon Client ID' },
        clientSecret: { type: 'string', description: 'Amazon Client Secret' },
        redirectUri: { type: 'string', description: 'Redirect URI used in OAuth flow' }
      },
      required: ['code', 'clientId', 'clientSecret', 'redirectUri']
    }
  })
  async exchangeCodeForToken(
    @Body() body: { code: string; clientId: string; clientSecret: string; redirectUri: string }
  ) {
    try {
      const { code, clientId, clientSecret, redirectUri } = body;

      // Exchange code for tokens
      const tokenData = await this.amazonAuthService.exchangeCodeForToken(
        code,
        clientId,
        clientSecret,
        redirectUri
      );

      if (!tokenData.refreshToken) {
        throw new HttpException('No refresh token received', HttpStatus.BAD_REQUEST);
      }

      // Save to .env file
      const envPath = path.join(__dirname, '../../.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent = envContent.replace(
        /AMAZON_REFRESH_TOKEN=.*/,
        `AMAZON_REFRESH_TOKEN=${tokenData.refreshToken}`
      );
      
      fs.writeFileSync(envPath, envContent);

      return {
        success: true,
        message: 'Refresh token saved successfully',
        refreshToken: tokenData.refreshToken,
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to exchange code for token',
          error: error.response?.data || error.message
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('profiles')
  @ApiOperation({ 
    summary: 'Get Amazon Advertising profiles',
    description: 'Fetches all advertising profiles associated with the account'
  })
  async getProfiles() {
    try {
      const profiles = await this.amazonAuthService.getProfiles();
      return {
        success: true,
        profiles
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch profiles',
          error: error.response?.data || error.message
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('debug-token')
  @ApiOperation({ 
    summary: 'Debug access token (shows first 50 characters)',
    description: 'Shows the current access token for debugging purposes'
  })
  async debugToken() {
    try {
      const accessToken = await this.amazonAuthService.getAccessToken();
      return {
        success: true,
        tokenPreview: accessToken.substring(0, 50) + '...',
        tokenLength: accessToken.length,
        hasWhitespace: /\s/.test(accessToken),
        hasNewlines: /\n/.test(accessToken),
        startsWithBearer: accessToken.startsWith('Bearer '),
        firstChar: accessToken.charCodeAt(0),
        lastChar: accessToken.charCodeAt(accessToken.length - 1)
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get access token',
          error: error.response?.data || error.message
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('test-amazon-api')
  @ApiOperation({ 
    summary: 'Test Amazon API directly with current token',
    description: 'Makes a direct call to Amazon Ads API to test authentication'
  })
  async testAmazonApi() {
    try {
      const axios = require('axios');
      const accessToken = await this.amazonAuthService.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      
      // Test /v2/profiles endpoint
      const response = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'Amazon API responded successfully',
        profileCount: response.data.length,
        firstProfile: response.data[0]
      };
    } catch (error) {
      return {
        success: false,
        message: 'Amazon API call failed',
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data || error.message,
        headers: error.config?.headers
      };
    }
  }
}
