
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard & Analytics')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard-Übersicht abrufen' })
  async getOverview() {
    const data = await this.dashboardService.getDashboardOverview();
    return {
      success: true,
      data,
    };
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Kampagnen-Performance abrufen' })
  async getCampaigns() {
    const data = await this.dashboardService.getCampaignPerformance();
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('keywords')
  @ApiOperation({ summary: 'Keyword-Performance abrufen' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getKeywords(@Query('limit') limit?: string) {
    const data = await this.dashboardService.getKeywordPerformance(
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'System-Status abrufen' })
  async getStatus() {
    const data = await this.dashboardService.getSystemStatus();
    return {
      success: true,
      data,
    };
  }
}
