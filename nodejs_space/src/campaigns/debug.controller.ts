
import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@ApiTags('debug')
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    private readonly amazonAuth: AmazonAuthService,
    private readonly configService: ConfigService,
  ) {}

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

  @Get('test-headers')
  @ApiOperation({ summary: 'Show exact headers being sent to Amazon' })
  @ApiResponse({ status: 200, description: 'Returns header details' })
  async testHeaders() {
    try {
      const axios = require('axios');
      const accessToken = await this.amazonAuth.getAccessToken();
      const clientId = process.env.AMAZON_CLIENT_ID;
      const profileId = process.env.AMAZON_PROFILE_ID;
      
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': String(profileId),
        'Content-Type': 'application/json'
      };
      
      // Test with exact headers
      let testResult = null;
      try {
        const response = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
          headers: headers
        });
        testResult = {
          success: true,
          campaignCount: response.data.length
        };
      } catch (error) {
        testResult = {
          success: false,
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.response?.data,
          requestHeaders: error.config?.headers
        };
      }
      
      return {
        sentHeaders: {
          'Authorization': `Bearer ${accessToken.substring(0, 30)}... (length: ${accessToken.length})`,
          'Amazon-Advertising-API-ClientId': clientId.substring(0, 30) + '...',
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json'
        },
        fullAuthToken: {
          length: accessToken.length,
          startsWidth: accessToken.substring(0, 10),
          endsWidth: accessToken.substring(accessToken.length - 10),
          hasWhitespace: accessToken !== accessToken.trim(),
          hasNewlines: accessToken.includes('\n') || accessToken.includes('\r')
        },
        testResult
      };
    } catch (error) {
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

  @Get('oauth-start')
  @ApiOperation({ summary: 'Start OAuth flow to generate new refresh token' })
  @ApiResponse({ status: 302, description: 'Redirects to Amazon authorization' })
  oauthStart(@Res() res: Response) {
    const clientId = this.configService.get<string>('AMAZON_CLIENT_ID');
    const redirectUri = 'https://amazon-ads-backend-production.up.railway.app/debug/oauth-callback';
    
    const authUrl = `https://www.amazon.com/ap/oa?` +
      `client_id=${clientId}` +
      `&scope=advertising::campaign_management` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    this.logger.log('🔐 Starting OAuth flow...');
    this.logger.log(`   Redirect URI: ${redirectUri}`);
    this.logger.log(`   Scope: advertising::campaign_management`);
    
    return res.redirect(authUrl);
  }

  @Get('oauth-callback')
  @ApiOperation({ summary: 'OAuth callback - generates refresh token' })
  @ApiResponse({ status: 200, description: 'Displays the new refresh token' })
  async oauthCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      this.logger.error('❌ No authorization code received');
      return res.send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 50px; background: #ffe6e6;">
            <h1 style="color: red;">❌ Fehler</h1>
            <p>Kein Authorization Code erhalten!</p>
            <p><a href="/debug/oauth-start">Erneut versuchen</a></p>
          </body>
        </html>
      `);
    }

    try {
      const axios = require('axios');
      this.logger.log('✅ Authorization code received');
      this.logger.log(`   Code: ${code.substring(0, 30)}...`);

      const clientId = this.configService.get<string>('AMAZON_CLIENT_ID');
      const clientSecret = this.configService.get<string>('AMAZON_CLIENT_SECRET');
      const redirectUri = 'https://amazon-ads-backend-production.up.railway.app/debug/oauth-callback';

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      this.logger.log('📤 Exchanging code for refresh token...');

      const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        },
      );

      const refreshToken = response.data.refresh_token;
      const accessToken = response.data.access_token;

      this.logger.log('🎉 TOKEN ERFOLGREICH GENERIERT!');
      this.logger.log(`   Refresh Token: ${refreshToken.substring(0, 50)}...`);

      // Test the token immediately
      let testResult = '';
      try {
        const profilesResponse = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json'
          }
        });

        const profiles = profilesResponse.data;
        this.logger.log(`✅ Token funktioniert! ${profiles.length} Profile gefunden`);

        // Test campaigns with first profile
        if (profiles.length > 0) {
          const profileId = profiles[0].profileId;
          try {
            const campaignsResponse = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': String(profileId),
                'Content-Type': 'application/json'
              }
            });
            
            testResult = `
              <div style="background: #e6ffe6; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h2 style="color: green;">✅ TOKEN FUNKTIONIERT PERFEKT!</h2>
                <p><strong>Profile gefunden:</strong> ${profiles.length}</p>
                <p><strong>Kampagnen gefunden:</strong> ${campaignsResponse.data.length}</p>
                <p><strong>Getestete Profile ID:</strong> ${profileId}</p>
              </div>
            `;
            
            this.logger.log(`✅ KAMPAGNEN-ZUGRIFF FUNKTIONIERT! ${campaignsResponse.data.length} Kampagnen gefunden`);
          } catch (error) {
            testResult = `
              <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h2 style="color: orange;">⚠️ Warnung</h2>
                <p><strong>Profile gefunden:</strong> ${profiles.length}</p>
                <p><strong>Kampagnen-Test:</strong> Fehlgeschlagen (${error.response?.status})</p>
                <p><strong>Fehler:</strong> ${error.response?.data?.message || error.message}</p>
              </div>
            `;
            this.logger.warn(`⚠️ Kampagnen-Test fehlgeschlagen: ${error.response?.status}`);
          }
        }
      } catch (error) {
        testResult = `
          <div style="background: #ffe6e6; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2 style="color: red;">❌ Token-Test fehlgeschlagen</h2>
            <p>${error.message}</p>
          </div>
        `;
        this.logger.error(`❌ Token-Test fehlgeschlagen: ${error.message}`);
      }

      return res.send(`
        <html>
          <head>
            <title>Token Generiert!</title>
            <style>
              body { font-family: Arial; padding: 50px; background: #f0f0f0; }
              .token-box { 
                background: white; 
                padding: 20px; 
                border-radius: 5px; 
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 14px;
                border: 2px solid #4CAF50;
              }
              .instruction {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin: 10px 0;
              }
              button {
                background: #4CAF50;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              }
              button:hover { background: #45a049; }
            </style>
          </head>
          <body>
            <h1 style="color: green;">🎉 Neuer Refresh Token generiert!</h1>
            
            ${testResult}
            
            <div class="instruction">
              <h2>📋 Nächste Schritte:</h2>
              <ol>
                <li>Kopiere den Token unten (Button klicken)</li>
                <li>Gehe zu Railway Dashboard → Variables</li>
                <li>Ändere <code>AMAZON_REFRESH_TOKEN</code> zu diesem neuen Wert</li>
                <li>Speichern → Railway deployed automatisch neu</li>
                <li>Warte 2-3 Minuten</li>
                <li>Teste: <code>/api/campaigns</code></li>
              </ol>
            </div>
            
            <h2>🔑 Dein neuer Refresh Token:</h2>
            <div class="token-box" id="tokenBox">${refreshToken}</div>
            
            <button onclick="copyToken()">📋 Token kopieren</button>
            <span id="copyStatus" style="margin-left: 10px; color: green; display: none;">✅ Kopiert!</span>
            
            <script>
              function copyToken() {
                const tokenText = document.getElementById('tokenBox').innerText;
                navigator.clipboard.writeText(tokenText).then(() => {
                  document.getElementById('copyStatus').style.display = 'inline';
                  setTimeout(() => {
                    document.getElementById('copyStatus').style.display = 'none';
                  }, 3000);
                });
              }
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      this.logger.error('❌ Token exchange failed:', error.response?.data || error.message);
      
      return res.send(`
        <html>
          <head><title>Fehler</title></head>
          <body style="font-family: Arial; padding: 50px; background: #ffe6e6;">
            <h1 style="color: red;">❌ Token-Generierung fehlgeschlagen</h1>
            <p><strong>Fehler:</strong></p>
            <pre style="background: white; padding: 20px; border-radius: 5px;">${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
            <p><a href="/debug/oauth-start">Erneut versuchen</a></p>
          </body>
        </html>
      `);
    }
  }
}
