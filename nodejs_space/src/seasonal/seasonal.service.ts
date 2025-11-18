
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SeasonalConfig {
  season: string;
  startMonth: number; // 1-12
  endMonth: number;
  budgetMultiplier: number; // 1.0 = normal, 1.5 = +50%, 0.7 = -30%
  keywords: string[];
}

@Injectable()
export class SeasonalService {
  private readonly logger = new Logger(SeasonalService.name);

  // Saisonale Konfiguration für Blumenzwiebeln & Pflanzen
  private readonly seasonalConfigs: SeasonalConfig[] = [
    {
      season: 'Frühling - Pflanzzeit',
      startMonth: 3, // März
      endMonth: 5,   // Mai
      budgetMultiplier: 1.5, // +50% Budget
      keywords: ['blumenzwiebeln frühling', 'tulpen pflanzen', 'narzissen', 'frühjahrsblüher', 'frühlingsblumen'],
    },
    {
      season: 'Herbst - Hauptpflanzzeit',
      startMonth: 9,  // September
      endMonth: 11,   // November
      budgetMultiplier: 1.8, // +80% Budget (wichtigste Saison!)
      keywords: ['blumenzwiebeln herbst', 'tulpenzwiebeln kaufen', 'herbstpflanzung', 'winterharte pflanzen'],
    },
    {
      season: 'Sommer - Nebensaison',
      startMonth: 6,
      endMonth: 8,
      budgetMultiplier: 0.7, // -30% Budget
      keywords: ['sommerblumen', 'topfpflanzen'],
    },
    {
      season: 'Winter - Ruhephase',
      startMonth: 12,
      endMonth: 2,
      budgetMultiplier: 0.6, // -40% Budget
      keywords: ['zimmerpflanzen', 'weihnachtsgeschenke pflanzen'],
    },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Täglich um 2 Uhr: Saisonale Anpassungen prüfen
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applySeasonalAdjustments(): Promise<void> {
    this.logger.log('🌡️ Prüfe saisonale Anpassungen...');

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12

      // Finde aktive Saison
      const activeSeason = this.findActiveSeason(currentMonth);

      if (!activeSeason) {
        this.logger.log('Keine spezielle Saison aktiv');
        return;
      }

      this.logger.log(`🌸 Aktive Saison: ${activeSeason.season} (Budget-Multiplier: ${activeSeason.budgetMultiplier}x)`);

      // Budget-Anpassung für alle Kampagnen
      await this.adjustCampaignBudgets(activeSeason.budgetMultiplier);

      // Saisonale Keywords aktivieren/pausieren
      await this.manageSeasonalKeywords(activeSeason);

      this.logger.log('✅ Saisonale Anpassungen abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler bei saisonalen Anpassungen:', error);
    }
  }

  /**
   * Finde aktive Saison
   */
  private findActiveSeason(month: number): SeasonalConfig | null {
    for (const config of this.seasonalConfigs) {
      // Handle wrap-around (z.B. Winter: Dez-Feb)
      if (config.startMonth <= config.endMonth) {
        if (month >= config.startMonth && month <= config.endMonth) {
          return config;
        }
      } else {
        if (month >= config.startMonth || month <= config.endMonth) {
          return config;
        }
      }
    }
    return null;
  }

  /**
   * Budget-Anpassung für Saison
   */
  private async adjustCampaignBudgets(multiplier: number): Promise<void> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: 'ENABLED' },
    });

    for (const campaign of campaigns) {
      const baseBudget = 50; // Standard-Budget
      const seasonalBudget = parseFloat((baseBudget * multiplier).toFixed(2));

      await this.prisma.campaign.update({
        where: { campaignId: campaign.campaignId },
        data: {
          budget: seasonalBudget,
          lastUpdated: new Date(),
        },
      });

      this.logger.log(`  📊 ${campaign.name}: Budget angepasst auf ${seasonalBudget}€ (${multiplier}x)`);
    }
  }

  /**
   * Saisonale Keywords managen
   */
  private async manageSeasonalKeywords(season: SeasonalConfig): Promise<void> {
    // Aktiviere saisonale Keywords
    for (const keywordText of season.keywords) {
      const keywords = await this.prisma.keyword.findMany({
        where: {
          keywordText: {
            contains: keywordText,
            mode: 'insensitive',
          },
        },
      });

      for (const keyword of keywords) {
        await this.prisma.keyword.update({
          where: { id: keyword.id },
          data: {
            status: 'ENABLED',
            bid: 0.80, // Erhöhtes Gebot für saisonale Keywords
            lastUpdated: new Date(),
          },
        });
      }

      this.logger.log(`  🎯 Keyword "${keywordText}" aktiviert`);
    }

    // Deaktiviere nicht-saisonale Keywords (optional)
    const allSeasonalKeywords = this.seasonalConfigs.flatMap((c) => c.keywords);
    const nonSeasonalKeywords = allSeasonalKeywords.filter((kw) => !season.keywords.includes(kw));

    for (const keywordText of nonSeasonalKeywords) {
      const keywords = await this.prisma.keyword.findMany({
        where: {
          keywordText: {
            contains: keywordText,
            mode: 'insensitive',
          },
        },
      });

      for (const keyword of keywords) {
        // Reduziere Gebot statt pausieren
        await this.prisma.keyword.update({
          where: { id: keyword.id },
          data: {
            bid: 0.35, // Niedrigeres Gebot außerhalb der Saison
            lastUpdated: new Date(),
          },
        });
      }
    }
  }

  /**
   * Saisonale Statistik abrufen
   */
  async getSeasonalStats(): Promise<any> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const activeSeason = this.findActiveSeason(currentMonth);

    return {
      currentMonth,
      activeSeason: activeSeason ? activeSeason.season : 'Keine spezielle Saison',
      budgetMultiplier: activeSeason ? activeSeason.budgetMultiplier : 1.0,
      allSeasons: this.seasonalConfigs.map((s) => ({
        season: s.season,
        months: `${s.startMonth}-${s.endMonth}`,
        budgetMultiplier: s.budgetMultiplier,
        keywordCount: s.keywords.length,
      })),
    };
  }
}
