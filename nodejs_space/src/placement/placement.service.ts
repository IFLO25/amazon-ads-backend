
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PlacementPerformance {
  placement: 'TOP_OF_SEARCH' | 'REST_OF_SEARCH' | 'PRODUCT_PAGES';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  conversions: number;
  acos: number;
  ctr: number;
  cvr: number;
}

@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  // Ziel-ACoS für Placements
  private readonly TARGET_ACOS = 15;
  private readonly MAX_ACOS = 40;

  constructor(private prisma: PrismaService) {}

  /**
   * Täglich um 4 Uhr: Placement-Optimierung
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async optimizePlacements(): Promise<void> {
    this.logger.log('🎯 Starte Placement-Optimierung...');

    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: { status: 'ENABLED' },
      });

      for (const campaign of campaigns) {
        await this.optimizeCampaignPlacements(campaign.campaignId);
      }

      this.logger.log('✅ Placement-Optimierung abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler bei Placement-Optimierung:', error);
    }
  }

  /**
   * Optimiere Placements einer Kampagne
   */
  private async optimizeCampaignPlacements(campaignId: string): Promise<void> {
    const performance = await this.analyzePlacementPerformance(campaignId);

    this.logger.log(`📊 Placement-Performance für Kampagne ${campaignId}:`);

    for (const placement of performance) {
      this.logger.log(
        `  ${placement.placement}: ACoS ${placement.acos.toFixed(1)}%, CTR ${placement.ctr.toFixed(2)}%, CVR ${placement.cvr.toFixed(2)}%`
      );

      // Bid-Multiplikator berechnen
      let bidAdjustment = 0;

      if (placement.acos < this.TARGET_ACOS && placement.conversions > 0) {
        // Sehr profitabel → Gebote erhöhen
        bidAdjustment = 40; // +40%
      } else if (placement.acos < this.TARGET_ACOS * 1.5) {
        // OK Performance → Leicht erhöhen
        bidAdjustment = 20; // +20%
      } else if (placement.acos < this.MAX_ACOS) {
        // Mittelmäßig → Leicht senken
        bidAdjustment = -10; // -10%
      } else {
        // Schlecht → Stark senken
        bidAdjustment = -30; // -30%
      }

      // Anpassung speichern
      await this.applyPlacementBidAdjustment(campaignId, placement.placement, bidAdjustment);

      this.logger.log(
        `  → Gebot-Anpassung: ${bidAdjustment > 0 ? '+' : ''}${bidAdjustment}%`
      );
    }
  }

  /**
   * Analysiere Placement-Performance
   */
  async analyzePlacementPerformance(campaignId: string): Promise<PlacementPerformance[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Alle Keywords der Kampagne
    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Gruppiere nach Placement (simuliert - in echter API würdest du das von Amazon bekommen)
    const placements: { [key: string]: any } = {
      TOP_OF_SEARCH: { impressions: 0, clicks: 0, spend: 0, sales: 0, conversions: 0 },
      REST_OF_SEARCH: { impressions: 0, clicks: 0, spend: 0, sales: 0, conversions: 0 },
      PRODUCT_PAGES: { impressions: 0, clicks: 0, spend: 0, sales: 0, conversions: 0 },
    };

    // Simuliere Verteilung (40% Top, 40% Rest, 20% Product Pages)
    keywords.forEach((kw: any) => {
      const rand = Math.random();
      let placement: string;

      if (rand < 0.4) placement = 'TOP_OF_SEARCH';
      else if (rand < 0.8) placement = 'REST_OF_SEARCH';
      else placement = 'PRODUCT_PAGES';

      placements[placement].impressions += kw.impressions || 0;
      placements[placement].clicks += kw.clicks || 0;
      placements[placement].spend += kw.spend || 0;
      placements[placement].sales += kw.sales || 0;
      placements[placement].conversions += kw.conversions || 0;
    });

    // Berechne Metriken
    return Object.entries(placements).map(([placement, data]) => ({
      placement: placement as any,
      impressions: data.impressions,
      clicks: data.clicks,
      spend: data.spend,
      sales: data.sales,
      conversions: data.conversions,
      acos: data.sales > 0 ? (data.spend / data.sales) * 100 : 0,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cvr: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
    }));
  }

  /**
   * Wende Placement-Bid-Anpassung an
   */
  private async applyPlacementBidAdjustment(
    campaignId: string,
    placement: string,
    adjustmentPercent: number,
  ): Promise<void> {
    try {
      // Speichere Placement-Einstellung
      await this.prisma.placementBidAdjustment.upsert({
        where: {
          campaignId_placement: {
            campaignId,
            placement,
          },
        },
        update: {
          adjustmentPercent,
          lastUpdated: new Date(),
        },
        create: {
          campaignId,
          placement,
          adjustmentPercent,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Fehler bei Placement-Adjustment für ${campaignId}:`, error);
    }
  }

  /**
   * Hole Placement-Einstellungen
   */
  async getPlacementSettings(campaignId: string): Promise<any> {
    const adjustments = await this.prisma.placementBidAdjustment.findMany({
      where: { campaignId },
    });

    return adjustments;
  }
}
