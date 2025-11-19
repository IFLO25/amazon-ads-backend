
import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import axios from 'axios';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private configService: ConfigService) {}

  @Get('start')
  @ApiOperation({ summary: 'Start OAuth flow to get new refresh token' })
  @ApiResponse({ status: 302, description: 'Redirects to Amazon authorization' })
  startOAuth(@Res() res: Response) {
    const clientId = this.configService.get<string>('AMAZON_CLIENT_ID');
    const redirectUri = `${this.configService.get<string>('BACKEND_URL') || 'https://amazon-ads-backend-production.up.railway.app'}/oauth/callback`;
    
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

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback - receives authorization code' })
  @ApiResponse({ status: 200, description: 'Returns the new refresh token' })
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      this.logger.error('❌ No authorization code received');
      return res.send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 50px; background: #ffe6e6;">
            <h1 style="color: red;">❌ Fehler</h1>
            <p>Kein Authorization Code erhalten!</p>
            <p><a href="/oauth/start">Erneut versuchen</a></p>
          </body>
        </html>
      `);
    }

    try {
      this.logger.log('✅ Authorization code received');
      this.logger.log(`   Code: ${code.substring(0, 30)}...`);

      const clientId = this.configService.get<string>('AMAZON_CLIENT_ID');
      const clientSecret = this.configService.get<string>('AMAZON_CLIENT_SECRET');
      const redirectUri = `${this.configService.get<string>('BACKEND_URL') || 'https://amazon-ads-backend-production.up.railway.app'}/oauth/callback`;

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
                <li>Kopiere den Token unten</li>
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
            <p><a href="/oauth/start">Erneut versuchen</a></p>
          </body>
        </html>
      `);
    }
  }
}
