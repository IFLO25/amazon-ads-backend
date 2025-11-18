
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class ProtectionService {
  private readonly logger = new Logger(ProtectionService.name);

  // Limits
  private readonly MAX_DAILY_SPEND = 100; // Max 100€ pro Tag
  private readonly MAX_KEYWORD_BID = 5.00; // Max 5€ pro Klick
  private readonly SPIKE_THRESHOLD = 2.5; // 2.5x normaler Spend = Spike

  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
  ) {}

  /**
   * Stündlich: Budget-Schutz prüfen
   */
  @Cron('0 * * * *') // Jede Stunde
  async checkBudgetProtection(): Promise<void> {
    this.logger.log('🛡️ Prüfe Budget-Schutz...');

    try {
      await this.checkDailySpendLimit();
      await this.checkCostSpikes();
      await this.checkBidLimits();

      this.logger.log('✅ Budget-Schutz-Prüfung abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler beim Budget-Schutz:', error);
    }
  }

  /**
   * Prüfe Tagesbudget-Limit
   */
  private async checkDailySpendLimit(): Promise<void> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: 'ENABLED' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const campaign of campaigns) {
      const dailySpend = await this.calculateDailySpend(campaign.campaignId, today);

      if (dailySpend >= this.MAX_DAILY_SPEND) {
        // Pausiere Kampagne
        await this.prisma.campaign.update({
          where: { campaignId: campaign.campaignId },
          data: {
            status: 'PAUSED',
            lastUpdated: new Date(),
          },
        });

        // Alert senden
        await this.alertsService.sendAlert({
          type: 'BUDGET_EXCEEDED',
          severity: 'CRITICAL',
          title: '🛡️ Budget-Limit erreicht - Kampagne pausiert',
          message: `Kampagne "${campaign.name}" wurde automatisch pausiert da das Tagesbudget-Limit von ${this.MAX_DAILY_SPEND}€ erreicht wurde (${dailySpend.toFixed(2)}€).`,
          campaignId: campaign.campaignId,
          campaignName: campaign.name,
          data: { dailySpend, limit: this.MAX_DAILY_SPEND },
        });

        this.logger.warn(`⏸️ Kampagne ${campaign.name} pausiert: Budget-Limit erreicht (${dailySpend}€)`);
      }
    }
  }

  /**
   * Prüfe auf Kosten-Spikes
   */
  private async checkCostSpikes(): Promise<void> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: 'ENABLED' },
    });

    for (const campaign of campaigns) {
      const avgDailySpend = await this.getAverageDailySpend(campaign.campaignId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySpend = await this.calculateDailySpend(campaign.campaignId, today);

      // Spike erkannt?
      if (todaySpend > avgDailySpend * this.SPIKE_THRESHOLD && avgDailySpend > 5) {
        // Reduziere Gebote um 30%
        await this.reduceAllBids(campaign.campaignId, 0.7);

        // Alert senden
        await this.alertsService.sendAlert({
          type: 'HIGH_COST_SPIKE',
          severity: 'WARNING',
          title: '⚡ Kosten-Spike erkannt - Gebote reduziert',
          message: `Kampagne "${campaign.name}" zeigt ungewöhnlich hohe Ausgaben (${todaySpend.toFixed(2)}€ vs. Durchschnitt ${avgDailySpend.toFixed(2)}€). Gebote wurden automatisch um 30% reduziert.`,
          campaignId: campaign.campaignId,
          campaignName: campaign.name,
          data: {
            todaySpend,
            avgDailySpend,
            spikeMultiplier: (todaySpend / avgDailySpend).toFixed(2),
          },
        });

        this.logger.warn(
          `⚠️ Kosten-Spike bei ${campaign.name}: ${todaySpend}€ vs. Ø ${avgDailySpend}€ - Gebote reduziert`,
        );
      }
    }
  }

  /**
   * Prüfe Gebots-Limits
   */
  private async checkBidLimits(): Promise<void> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        status: 'ENABLED',
        bid: {
          gt: this.MAX_KEYWORD_BID,
        },
      },
    });

    for (const keyword of keywords) {
      // Reduziere auf Max-Bid
      await this.prisma.keyword.update({
        where: { id: keyword.id },
        data: {
          bid: this.MAX_KEYWORD_BID,
          lastUpdated: new Date(),
        },
      });

      this.logger.warn(
        `⚠️ Keyword "${keyword.keywordText}" Gebot reduziert von ${keyword.bid}€ auf ${this.MAX_KEYWORD_BID}€`,
      );
    }

    if (keywords.length > 0) {
      await this.alertsService.sendAlert({
        type: 'BUDGET_WARNING',
        severity: 'WARNING',
        title: '🛡️ Gebots-Limits angewendet',
        message: `${keywords.length} Keywords hatten zu hohe Gebote und wurden auf das Maximum von ${this.MAX_KEYWORD_BID}€ reduziert.`,
        data: { count: keywords.length, maxBid: this.MAX_KEYWORD_BID },
      });
    }
  }

  /**
   * Reduziere alle Gebote einer Kampagne
   */
  private async reduceAllBids(campaignId: string, multiplier: number): Promise<void> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        status: 'ENABLED',
      },
    });

    for (const keyword of keywords) {
      const newBid = parseFloat((keyword.bid * multiplier).toFixed(2));
      await this.prisma.keyword.update({
        where: { id: keyword.id },
        data: {
          bid: Math.max(newBid, 0.10), // Minimum 10 Cent
          lastUpdated: new Date(),
        },
      });
    }
  }

  // Helper-Methoden
  private async calculateDailySpend(campaignId: string, date: Date): Promise<number> {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: date,
          lt: nextDay,
        },
      },
    });

    return keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
  }

  private async getAverageDailySpend(campaignId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalSpend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    return totalSpend / 30;
  }

  /**
   * Manuelle Budget-Schutz Einstellungen abrufen
   */
  async getProtectionSettings(): Promise<any> {
    return {
      maxDailySpend: this.MAX_DAILY_SPEND,
      maxKeywordBid: this.MAX_KEYWORD_BID,
      spikeThreshold: this.SPIKE_THRESHOLD,
      status: 'ACTIVE',
    };
  }
}
