
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';

@ApiTags('status')
@Controller('api/status')
export class StatusController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amazonAuth: AmazonAuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system status' })
  @ApiResponse({ status: 200, description: 'Returns system health status' })
  async getStatus() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const dbStatus = 'connected';

      // Check Amazon API credentials
      const amazonConfigured = this.amazonAuth.isConfigured();

      // Get campaign stats
      const totalCampaigns = await this.prisma.campaign.count();
      const enabledCampaigns = await this.prisma.campaign.count({
        where: { status: 'ENABLED' },
      });
      const pausedCampaigns = await this.prisma.campaign.count({
        where: { status: 'PAUSED' },
      });

      // Get last optimization time
      const lastOptimization = await this.prisma.optimizationHistory.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      // Get today's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayMetrics = await this.prisma.performanceMetric.findMany({
        where: { date: { gte: today } },
      });

      const todaySpend = todayMetrics.reduce((sum: number, m: any) => sum + m.spend, 0);
      const todaySales = todayMetrics.reduce((sum: number, m: any) => sum + m.sales, 0);

      return {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          database: {
            status: dbStatus,
            connected: true,
          },
          amazonApi: {
            status: amazonConfigured ? 'configured' : 'not_configured',
            configured: amazonConfigured,
          },
        },
        campaigns: {
          total: totalCampaigns,
          enabled: enabledCampaigns,
          paused: pausedCampaigns,
          archived: totalCampaigns - enabledCampaigns - pausedCampaigns,
        },
        optimization: {
          lastRun: lastOptimization?.timestamp || null,
          totalActions: await this.prisma.optimizationHistory.count(),
        },
        performance: {
          today: {
            spend: todaySpend,
            sales: todaySales,
            acos: todaySales > 0 ? (todaySpend / todaySales) * 100 : 0,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Simple health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }
}
