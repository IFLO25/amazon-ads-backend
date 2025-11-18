
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

interface AmazonCampaign {
  campaignId: string;
  name: string;
  state: string;
  budget: {
    budget: number;
    budgetType: string;
  };
  startDate: string;
  endDate?: string;
  targetingType: string;
}

interface AmazonReportMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  conversions: number;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amazonApi: AmazonApiClient,
  ) {}

  /**
   * Sync campaigns from Amazon Advertising API
   */
  async syncCampaignsFromAmazon(): Promise<void> {
    try {
      this.logger.log('Starting campaign sync from Amazon...');

      // Fetch campaigns from Amazon API (SP API v3)
      const campaigns = await this.amazonApi.get<AmazonCampaign[]>('/sp/campaigns');

      this.logger.log(`Fetched ${campaigns.length} campaigns from Amazon`);

      // Upsert campaigns in database
      for (const amazonCampaign of campaigns) {
        const existingCampaign = await this.prisma.campaign.findUnique({
          where: { campaignId: amazonCampaign.campaignId },
        });

        const campaignData = {
          campaignId: amazonCampaign.campaignId,
          name: amazonCampaign.name,
          status: amazonCampaign.state,
          budget: amazonCampaign.budget?.budget || 0,
          targetAcos: existingCampaign?.targetAcos || 15, // Default to 15%
        };

        if (existingCampaign) {
          await this.prisma.campaign.update({
            where: { campaignId: amazonCampaign.campaignId },
            data: {
              name: campaignData.name,
              status: campaignData.status,
              budget: campaignData.budget,
            },
          });
          this.logger.debug(`Updated campaign: ${amazonCampaign.name}`);
        } else {
          await this.prisma.campaign.create({
            data: campaignData,
          });
          this.logger.debug(`Created new campaign: ${amazonCampaign.name}`);
        }
      }

      this.logger.log('Campaign sync completed successfully');
    } catch (error) {
      this.logger.error('Failed to sync campaigns from Amazon', error.message);
      throw error;
    }
  }

  /**
   * Get all campaigns from database
   */
  async findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single campaign by ID
   */
  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        performanceMetrics: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days
        },
        optimizationHistory: {
          orderBy: { timestamp: 'desc' },
          take: 50, // Last 50 optimization actions
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  /**
   * Get campaign by Amazon campaign ID
   */
  async findByCampaignId(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { campaignId: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with Amazon ID ${campaignId} not found`);
    }

    return campaign;
  }

  /**
   * Get performance metrics for a campaign
   */
  async getPerformanceMetrics(id: string, days: number = 30) {
    const campaign = await this.findOne(id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.prisma.performanceMetric.findMany({
      where: {
        campaignId: campaign.campaignId,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate aggregated metrics
    const aggregated = metrics.reduce(
      (acc: any, metric: any) => {
        acc.totalImpressions += metric.impressions;
        acc.totalClicks += metric.clicks;
        acc.totalSpend += metric.spend;
        acc.totalSales += metric.sales;
        acc.totalConversions += metric.conversions;
        return acc;
      },
      {
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalSales: 0,
        totalConversions: 0,
      },
    );

    const avgAcos = aggregated.totalSales > 0 ? (aggregated.totalSpend / aggregated.totalSales) * 100 : 0;
    const ctr = aggregated.totalImpressions > 0 ? (aggregated.totalClicks / aggregated.totalImpressions) * 100 : 0;
    const conversionRate = aggregated.totalClicks > 0 ? (aggregated.totalConversions / aggregated.totalClicks) * 100 : 0;

    return {
      campaign: {
        id: campaign.id,
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status,
        targetAcos: campaign.targetAcos,
        currentAcos: campaign.currentAcos,
      },
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      metrics: {
        impressions: aggregated.totalImpressions,
        clicks: aggregated.totalClicks,
        spend: aggregated.totalSpend,
        sales: aggregated.totalSales,
        conversions: aggregated.totalConversions,
        acos: parseFloat(avgAcos.toFixed(2)),
        ctr: parseFloat(ctr.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        cpc: aggregated.totalClicks > 0 ? parseFloat((aggregated.totalSpend / aggregated.totalClicks).toFixed(2)) : 0,
        roas: aggregated.totalSpend > 0 ? parseFloat((aggregated.totalSales / aggregated.totalSpend).toFixed(2)) : 0,
      },
      dailyMetrics: metrics,
    };
  }

  /**
   * Update campaign in Amazon and database
   */
  async updateCampaign(
    campaignId: string,
    updates: { status?: string; budget?: number },
  ): Promise<void> {
    try {
      // Update in Amazon API
      const amazonUpdates: any = {};
      if (updates.status) {
        amazonUpdates.state = updates.status;
      }
      if (updates.budget) {
        amazonUpdates.budget = {
          budget: updates.budget,
          budgetType: 'DAILY',
        };
      }

      await this.amazonApi.put(`/sp/campaigns/${campaignId}`, amazonUpdates);

      // Update in database
      await this.prisma.campaign.update({
        where: { campaignId: campaignId },
        data: {
          ...updates,
        },
      });

      this.logger.log(`Updated campaign ${campaignId}`);
    } catch (error) {
      this.logger.error(`Failed to update campaign ${campaignId}`, error.message);
      throw error;
    }
  }

  /**
   * Fetch and store performance reports from Amazon
   */
  async syncPerformanceMetrics(): Promise<void> {
    try {
      this.logger.log('Starting performance metrics sync...');

      // Get date range (yesterday's data)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // Request a report from Amazon (simplified - actual implementation would use Report API)
      const campaigns = await this.prisma.campaign.findMany();

      for (const campaign of campaigns) {
        try {
          // Fetch metrics from Amazon API
          // Note: This is a simplified version. Real implementation would use Amazon's Report API
          const metrics = await this.fetchCampaignMetrics(campaign.campaignId, dateStr);

          // Store metrics
          await this.prisma.performanceMetric.upsert({
            where: {
              campaignId_date: {
                campaignId: campaign.campaignId,
                date: yesterday,
              },
            },
            create: {
              campaignId: campaign.campaignId,
              date: yesterday,
              impressions: metrics.impressions,
              clicks: metrics.clicks,
              spend: metrics.spend,
              sales: metrics.sales,
              conversions: metrics.conversions,
              acos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null,
            },
            update: {
              impressions: metrics.impressions,
              clicks: metrics.clicks,
              spend: metrics.spend,
              sales: metrics.sales,
              conversions: metrics.conversions,
              acos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null,
            },
          });

          // Update campaign's current ACoS
          const acos = metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null;
          await this.prisma.campaign.update({
            where: { campaignId: campaign.campaignId },
            data: { currentAcos: acos },
          });

          this.logger.debug(`Synced metrics for campaign: ${campaign.name}`);
        } catch (error) {
          this.logger.error(`Failed to sync metrics for campaign ${campaign.name}`, error.message);
        }
      }

      this.logger.log('Performance metrics sync completed');
    } catch (error) {
      this.logger.error('Failed to sync performance metrics', error.message);
      throw error;
    }
  }

  /**
   * Fetch campaign metrics from Amazon API
   * Simplified version - real implementation would use Report API
   */
  private async fetchCampaignMetrics(
    campaignId: string,
    date: string,
  ): Promise<AmazonReportMetrics> {
    // This is a placeholder. In production, you would:
    // 1. Request a report via POST /v2/sp/reports
    // 2. Poll for report status
    // 3. Download and parse the report
    
    // For now, return mock data or fetch from summary endpoint
    return {
      campaignId,
      impressions: 0,
      clicks: 0,
      spend: 0,
      sales: 0,
      conversions: 0,
    };
  }

  /**
   * 🎯 AUTOMATIC TARGETING MANAGEMENT - Optimize product and category targeting
   */
  async optimizeTargeting(campaignId: string): Promise<{
    targets_added: number;
    targets_paused: number;
    bidsAdjusted: number;
  }> {
    this.logger.log(`🎯 Optimiere Targeting für Kampagne ${campaignId}...`);

    const results = {
      targets_added: 0,
      targets_paused: 0,
      bidsAdjusted: 0,
    };

    try {
      // 1. Hole aktuelle Targeting-Daten
      const targets = await this.amazonApi.get<any[]>(
        `/v2/sp/targets?campaignIdFilter=${campaignId}&stateFilter=enabled`,
      );

      for (const target of targets) {
        // Hole Performance-Daten
        const performance = await this.getTargetPerformance(target.targetId, 14);

        // Pausiere schlecht performende Targets
        if (performance.acos > 60 && performance.clicks >= 10) {
          await this.amazonApi.put(`/v2/sp/targets/${target.targetId}`, {
            state: 'paused',
          });
          results.targets_paused++;
          this.logger.log(`  ⏸️ Target pausiert: ACoS ${performance.acos.toFixed(1)}%`);
        }
        // Passe Gebote an
        else if (performance.acos > 0 && performance.clicks >= 5) {
          const newBid = this.calculateOptimalTargetBid(performance);
          const currentBid = target.bid;
          const changePercent = Math.abs((newBid - currentBid) / currentBid) * 100;

          if (changePercent > 10) {
            await this.amazonApi.put(`/v2/sp/targets/${target.targetId}`, {
              bid: newBid,
            });
            results.bidsAdjusted++;
            this.logger.log(`  💰 Target-Gebot angepasst: ${currentBid.toFixed(2)} → ${newBid.toFixed(2)} €`);
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Fehler beim Optimieren des Targetings:', error.message);
      return results;
    }
  }

  /**
   * 📊 Hole Target-Performance
   */
  private async getTargetPerformance(targetId: string, days: number): Promise<{
    acos: number;
    clicks: number;
    spend: number;
    sales: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const report = await this.amazonApi.post<any>(
        '/v2/sp/targets/report',
        {
          targetIdFilter: [targetId],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          metrics: ['impressions', 'clicks', 'cost', 'sales'],
        },
      );

      if (!report || report.length === 0) {
        return { acos: 999, clicks: 0, spend: 0, sales: 0 };
      }

      const data = report[0];
      return {
        acos: data.sales > 0 ? (data.cost / data.sales) * 100 : 999,
        clicks: data.clicks || 0,
        spend: data.cost || 0,
        sales: data.sales || 0,
      };
    } catch (error) {
      return { acos: 999, clicks: 0, spend: 0, sales: 0 };
    }
  }

  /**
   * 🧮 Berechne optimales Target-Gebot
   */
  private calculateOptimalTargetBid(performance: {
    acos: number;
    clicks: number;
    spend: number;
  }): number {
    let bidMultiplier = 1.0;

    if (performance.acos < 10) {
      bidMultiplier = 1.25;
    } else if (performance.acos < 15) {
      bidMultiplier = 1.1;
    } else if (performance.acos < 25) {
      bidMultiplier = 1.0;
    } else if (performance.acos < 40) {
      bidMultiplier = 0.85;
    } else {
      bidMultiplier = 0.7;
    }

    const currentCpc = performance.clicks > 0 ? performance.spend / performance.clicks : 0.5;
    let newBid = currentCpc * bidMultiplier;
    newBid = Math.max(0.15, Math.min(5.0, newBid));

    return Math.round(newBid * 100) / 100;
  }
}
