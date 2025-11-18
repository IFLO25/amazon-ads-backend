
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Haupt-Dashboard Daten
   */
  async getDashboardOverview(): Promise<any> {
    const now = new Date();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Performance-Metriken
    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: { gte: last30Days },
      },
    });

    const totalImpressions = keywords.reduce((sum: any, kw: any) => sum + (kw.impressions || 0), 0);
    const totalClicks = keywords.reduce((sum: any, kw: any) => sum + (kw.clicks || 0), 0);
    const totalSpend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    const totalSales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
    const totalConversions = keywords.reduce((sum: any, kw: any) => sum + (kw.conversions || 0), 0);

    // Kampagnen-Status
    const allCampaigns = await this.prisma.campaign.findMany();
    const activeCampaigns = allCampaigns.filter((c: any) => c.status === 'ENABLED');

    // Keyword-Status
    const allKeywords = await this.prisma.keyword.findMany();
    const activeKeywords = allKeywords.filter((kw: any) => kw.status === 'ENABLED');

    return {
      overview: {
        totalCampaigns: allCampaigns.length,
        activeCampaigns: activeCampaigns.length,
        totalKeywords: allKeywords.length,
        activeKeywords: activeKeywords.length,
      },
      performance: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: parseFloat(totalSpend.toFixed(2)),
        sales: parseFloat(totalSales.toFixed(2)),
        conversions: totalConversions,
        acos: totalSales > 0 ? parseFloat(((totalSpend / totalSales) * 100).toFixed(2)) : 0,
        roas: totalSpend > 0 ? parseFloat((totalSales / totalSpend).toFixed(2)) : 0,
        ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        cvr: totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0,
      },
      period: 'Last 30 Days',
      lastUpdated: now,
    };
  }

  /**
   * Kampagnen-Performance
   */
  async getCampaignPerformance(): Promise<any[]> {
    const campaigns = await this.prisma.campaign.findMany({
      orderBy: { lastUpdated: 'desc' },
    });

    const performance = await Promise.all(
      campaigns.map(async (campaign: any) => {
        const keywords = await this.prisma.keyword.findMany({
          where: { campaignId: campaign.campaignId },
        });

        const spend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
        const sales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
        const conversions = keywords.reduce((sum: any, kw: any) => sum + (kw.conversions || 0), 0);

        return {
          campaignId: campaign.campaignId,
          name: campaign.name,
          type: campaign.campaignType,
          status: campaign.status,
          budget: campaign.budget,
          spend: parseFloat(spend.toFixed(2)),
          sales: parseFloat(sales.toFixed(2)),
          conversions,
          acos: sales > 0 ? parseFloat(((spend / sales) * 100).toFixed(2)) : 0,
          roas: spend > 0 ? parseFloat((sales / spend).toFixed(2)) : 0,
        };
      }),
    );

    return performance;
  }

  /**
   * Keyword-Performance
   */
  async getKeywordPerformance(limit = 50): Promise<any[]> {
    const keywords = await this.prisma.keyword.findMany({
      orderBy: { sales: 'desc' },
      take: limit,
    });

    return keywords.map((kw: any) => ({
      keywordId: kw.keywordId,
      keyword: kw.keywordText,
      campaignId: kw.campaignId,
      matchType: kw.matchType,
      status: kw.status,
      bid: kw.bid,
      impressions: kw.impressions,
      clicks: kw.clicks,
      spend: kw.spend,
      sales: kw.sales,
      conversions: kw.conversions,
      acos: kw.sales > 0 ? parseFloat(((kw.spend / kw.sales) * 100).toFixed(2)) : 0,
      ctr: kw.impressions > 0 ? parseFloat(((kw.clicks / kw.impressions) * 100).toFixed(2)) : 0,
    }));
  }

  /**
   * System-Status
   */
  async getSystemStatus(): Promise<any> {
    const lastOptimization = await this.getLastOptimizationTime();
    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      status: 'RUNNING',
      lastOptimization,
      recentAlerts: alerts.length,
      automationEnabled: true,
      features: {
        keywordOptimization: true,
        budgetManagement: true,
        dayparting: true,
        placementOptimization: true,
        seasonalAdjustments: true,
        autoCampaigns: true,
        keywordResearch: true,
        budgetProtection: true,
        alertSystem: true,
        reporting: true,
      },
    };
  }

  private async getLastOptimizationTime(): Promise<Date | null> {
    const lastKeyword = await this.prisma.keyword.findFirst({
      orderBy: { lastUpdated: 'desc' },
    });
    return lastKeyword ? lastKeyword.lastUpdated : null;
  }
}
