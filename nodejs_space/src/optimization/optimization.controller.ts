
import { Controller, Post, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OptimizationService } from './optimization.service';

@ApiTags('optimization')
@Controller('optimize')
export class OptimizationController {
  constructor(private readonly optimizationService: OptimizationService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger manual optimization of all campaigns' })
  @ApiResponse({ status: 200, description: 'Optimization completed successfully' })
  async optimize() {
    const actions = await this.optimizationService.optimizeAllCampaigns();
    return {
      message: 'Optimization completed',
      actionsCount: actions.length,
      actions,
      timestamp: new Date(),
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get optimization history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to fetch (default: 100)' })
  @ApiResponse({ status: 200, description: 'Returns optimization history' })
  async getHistory(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 100;
    return this.optimizationService.getOptimizationHistory(limitNumber);
  }
}
