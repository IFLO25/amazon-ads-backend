
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('optimization')
@Controller('optimization')
export class OptimizationController {
  private readonly logger = new Logger(OptimizationController.name);

  @Get('status')
  @ApiOperation({ summary: 'Get optimization status' })
  @ApiResponse({ status: 200, description: 'Returns optimization system status' })
  async getStatus() {
    this.logger.log('📊 Getting optimization status...');
    
    return {
      success: true,
      status: 'ready',
      message: 'Optimization system is operational',
      features: {
        keyword_optimization: 'Available',
        bid_management: 'Available',
        negative_keywords: 'Available',
        targeting_optimization: 'Available'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        note: 'Database-free mode - optimization runs directly against Amazon API'
      }
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Amazon Ads Optimizer',
      version: '2.0.0'
    };
  }
}
