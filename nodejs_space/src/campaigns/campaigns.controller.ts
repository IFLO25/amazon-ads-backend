
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Returns all campaigns from database' })
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID from database' })
  @ApiResponse({ status: 200, description: 'Returns campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get performance metrics for a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign UUID from database' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to fetch (default: 30)' })
  @ApiResponse({ status: 200, description: 'Returns aggregated performance metrics' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getPerformance(@Param('id') id: string, @Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.campaignsService.getPerformanceMetrics(id, daysNumber);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync campaigns from Amazon Advertising API' })
  @ApiResponse({ status: 200, description: 'Campaigns synced successfully' })
  @ApiResponse({ status: 500, description: 'Failed to sync campaigns' })
  async syncCampaigns() {
    await this.campaignsService.syncCampaignsFromAmazon();
    return { message: 'Campaigns synced successfully', timestamp: new Date() };
  }

  @Post('sync-metrics')
  @ApiOperation({ summary: 'Sync performance metrics from Amazon' })
  @ApiResponse({ status: 200, description: 'Metrics synced successfully' })
  @ApiResponse({ status: 500, description: 'Failed to sync metrics' })
  async syncMetrics() {
    await this.campaignsService.syncPerformanceMetrics();
    return { message: 'Performance metrics synced successfully', timestamp: new Date() };
  }
}
