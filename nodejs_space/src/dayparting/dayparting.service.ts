
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface DaypartingRule {
  dayOfWeek: number; // 0=Sonntag, 1=Montag, ..., 6=Samstag
  hourStart: number;
  hourEnd: number;
  bidMultiplier: number; // 1.0 = normal, 1.3 = +30%, 0.7 = -30%
}

@Injectable()
export class DaypartingService {
  private readonly logger = new Logger(DaypartingService.name);
  
  // Standard-Regeln für Blumenzwiebel-Business
  private readonly defaultRules: DaypartingRule[] = [
    // Wochentage - Bürozeiten (9-17 Uhr) - Leicht erhöht
    { dayOfWeek: 1, hourStart: 9, hourEnd: 17, bidMultiplier: 1.15 },
    { dayOfWeek: 2, hourStart: 9, hourEnd: 17, bidMultiplier: 1.15 },
    { dayOfWeek: 3, hourStart: 9, hourEnd: 17, bidMultiplier: 1.15 },
    { dayOfWeek: 4, hourStart: 9, hourEnd: 17, bidMultiplier: 1.15 },
    { dayOfWeek: 5, hourStart: 9, hourEnd: 17, bidMultiplier: 1.15 },
    
    // Wochentage - Abends (18-22 Uhr) - Prime Shopping Time!
    { dayOfWeek: 1, hourStart: 18, hourEnd: 22, bidMultiplier: 1.30 },
    { dayOfWeek: 2, hourStart: 18, hourEnd: 22, bidMultiplier: 1.30 },
    { dayOfWeek: 3, hourStart: 18, hourEnd: 22, bidMultiplier: 1.30 },
    { dayOfWeek: 4, hourStart: 18, hourEnd: 22, bidMultiplier: 1.30 },
    { dayOfWeek: 5, hourStart: 18, hourEnd: 22, bidMultiplier: 1.35 }, // Freitag noch besser
    
    // Wochentage - Nachts (23-6 Uhr) - Reduziert
    { dayOfWeek: 1, hourStart: 23, hourEnd: 6, bidMultiplier: 0.70 },
    { dayOfWeek: 2, hourStart: 23, hourEnd: 6, bidMultiplier: 0.70 },
    { dayOfWeek: 3, hourStart: 23, hourEnd: 6, bidMultiplier: 0.70 },
    { dayOfWeek: 4, hourStart: 23, hourEnd: 6, bidMultiplier: 0.70 },
    { dayOfWeek: 5, hourStart: 23, hourEnd: 6, bidMultiplier: 0.70 },
    
    // Wochenende - Tagsüber (10-20 Uhr) - Erhöht
    { dayOfWeek: 0, hourStart: 10, hourEnd: 20, bidMultiplier: 1.25 },
    { dayOfWeek: 6, hourStart: 10, hourEnd: 20, bidMultiplier: 1.25 },
    
    // Wochenende - Abends (20-23 Uhr) - Stark erhöht
    { dayOfWeek: 0, hourStart: 20, hourEnd: 23, bidMultiplier: 1.35 },
    { dayOfWeek: 6, hourStart: 20, hourEnd: 23, bidMultiplier: 1.35 },
    
    // Wochenende - Nachts - Reduziert
    { dayOfWeek: 0, hourStart: 23, hourEnd: 9, bidMultiplier: 0.75 },
    { dayOfWeek: 6, hourStart: 23, hourEnd: 9, bidMultiplier: 0.75 },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Jede Stunde: Dayparting anwenden
   */
  @Cron(CronExpression.EVERY_HOUR)
  async applyDayparting(): Promise<void> {
    this.logger.log('⏰ Starte Dayparting-Anpassungen...');
    
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();

      // Passende Regel finden
      const activeRule = this.findActiveRule(currentDay, currentHour);
      
      if (!activeRule) {
        this.logger.log('Keine aktive Dayparting-Regel für diese Zeit');
        return;
      }

      this.logger.log(
        `📊 Aktive Regel: Tag ${activeRule.dayOfWeek}, ${activeRule.hourStart}-${activeRule.hourEnd} Uhr, Multiplier: ${activeRule.bidMultiplier}x`
      );

      // Alle aktiven Kampagnen holen
      const campaigns = await this.prisma.campaign.findMany({
        where: { status: 'ENABLED' },
      });

      for (const campaign of campaigns) {
        await this.adjustCampaignBids(campaign.campaignId, activeRule.bidMultiplier);
      }

      this.logger.log('✅ Dayparting-Anpassungen abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler beim Dayparting:', error);
    }
  }

  /**
   * Finde die aktive Regel für Tag/Stunde
   */
  private findActiveRule(dayOfWeek: number, hour: number): DaypartingRule | null {
    for (const rule of this.defaultRules) {
      if (rule.dayOfWeek !== dayOfWeek) continue;

      // Handle Overnight-Regeln (z.B. 23-6 Uhr)
      if (rule.hourStart > rule.hourEnd) {
        if (hour >= rule.hourStart || hour < rule.hourEnd) {
          return rule;
        }
      } else {
        if (hour >= rule.hourStart && hour < rule.hourEnd) {
          return rule;
        }
      }
    }

    return null;
  }

  /**
   * Passe Gebote einer Kampagne an
   */
  private async adjustCampaignBids(campaignId: string, multiplier: number): Promise<void> {
    try {
      // Alle Keywords der Kampagne
      const keywords = await this.prisma.keyword.findMany({
        where: { 
          campaignId,
          status: 'ENABLED',
        },
      });

      for (const keyword of keywords) {
        const baseBid = keyword.bid || 0.50;
        const newBid = parseFloat((baseBid * multiplier).toFixed(2));

        // Bid in DB aktualisieren
        await this.prisma.keyword.update({
          where: { id: keyword.id },
          data: {
            bid: newBid,
            lastUpdated: new Date(),
          },
        });
      }

      this.logger.log(`📈 Kampagne ${campaignId}: ${keywords.length} Gebote um ${((multiplier - 1) * 100).toFixed(0)}% angepasst`);
    } catch (error) {
      this.logger.error(`Fehler bei Kampagne ${campaignId}:`, error);
    }
  }

  /**
   * Analyse: Beste Zeiten ermitteln
   */
  async analyzeBestTimes(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Performance pro Stunde gruppieren
    const hourlyPerformance: { [hour: number]: { sales: number; spend: number; conversions: number } } = {};

    for (let i = 0; i < 24; i++) {
      hourlyPerformance[i] = { sales: 0, spend: 0, conversions: 0 };
    }

    keywords.forEach((kw: any) => {
      const hour = kw.lastUpdated.getHours();
      hourlyPerformance[hour].sales += kw.sales || 0;
      hourlyPerformance[hour].spend += kw.spend || 0;
      hourlyPerformance[hour].conversions += kw.conversions || 0;
    });

    // ACoS und ROAS berechnen
    const analysis = Object.entries(hourlyPerformance).map(([hour, data]) => ({
      hour: parseInt(hour),
      sales: data.sales,
      spend: data.spend,
      conversions: data.conversions,
      acos: data.sales > 0 ? (data.spend / data.sales) * 100 : 0,
      roas: data.spend > 0 ? data.sales / data.spend : 0,
    }));

    // Sortiere nach ROAS
    analysis.sort((a, b) => b.roas - a.roas);

    return {
      bestHours: analysis.slice(0, 5),
      worstHours: analysis.slice(-5).reverse(),
      fullAnalysis: analysis,
    };
  }
}
