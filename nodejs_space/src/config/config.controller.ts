
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
import { ConfigService } from '@nestjs/config';

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
}
