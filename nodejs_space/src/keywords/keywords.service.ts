import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

interface KeywordPerformance {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adGroupId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  ctr: number;
  conversionRate: number;
}

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);

  constructor(
    private prisma: PrismaService,
    private amazonClient: AmazonApiClient,
  ) {}

  /**
   * 🎯 HAUPT-OPTIMIERUNG: Vollautomatische Keyword-Optimierung
   */
  async optimizeAllKeywords(): Promise<{
    negativeKeywordsAdded: number;
    positiveKeywordsAdded: number;
    keywordsPaused: number;
    bidsAdjusted: number;
  }> {
    this.logger.log('🎯 Starte vollautomatische Keyword-Optimierung...');

    const results = {
      negativeKeywordsAdded: 0,
      positiveKeywordsAdded: 0,
      keywordsPaused: 0,
      bidsAdjusted: 0,
    };

    try {
      // 1. Hole alle aktiven Kampagnen
      const campaigns = await this.amazonClient.getCampaigns('enabled');

      for (const campaign of campaigns) {
        this.logger.log(`📊 Analysiere Kampagne: ${campaign.name}`);

        // 2. Hole Performance-Daten der letzten 30 Tage
        const searchTerms = await this.getSearchTermReport(
          campaign.campaignId,
          30,
        );

        // 3. Negative Keywords hinzufügen (schlechte Performance)
        const negatives = await this.addNegativeKeywords(
          campaign.campaignId,
          searchTerms,
        );
        results.negativeKeywordsAdded += negatives;

        // 4. Positive Keywords erstellen (gute Performance)
        const positives = await this.addPositiveKeywords(
          campaign.campaignId,
          searchTerms,
        );
        results.positiveKeywordsAdded += positives;

        // 5. Schlecht performende Keywords pausieren
        const paused = await this.pauseBadKeywords(campaign.campaignId);
        results.keywordsPaused += paused;

        // 6. Gebote basierend auf Performance anpassen
        const adjusted = await this.adjustBids(campaign.campaignId);
        results.bidsAdjusted += adjusted;
      }

      // 7. Speichere Optimierungs-Report
      await this.saveOptimizationReport(results);

      this.logger.log('✅ Keyword-Optimierung abgeschlossen!');
      return results;
    } catch (error) {
      this.logger.error('❌ Fehler bei Keyword-Optimierung:', error);
      throw error;
    }
  }

  /**
   * 📊 Hole Suchbegriff-Report (Search Terms)
   */
  private async getSearchTermReport(
    campaignId: string,
    days: number,
  ): Promise<KeywordPerformance[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const report = await this.amazonClient.post<any>(
        '/sp/searchTerms/report',
        {
          campaignIdFilter: [campaignId],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          metrics: ['impressions', 'clicks', 'cost', 'sales', 'attributedConversions14d'],
        },
      );

      // Konvertiere zu KeywordPerformance Array
      return (report || []).map((item: any) => ({
        keywordId: item.keywordId || '',
        keyword: item.query || '',
        campaignId: item.campaignId || campaignId,
        adGroupId: item.adGroupId || '',
        impressions: item.impressions || 0,
        clicks: item.clicks || 0,
        spend: item.cost || 0,
        sales: item.sales14d || 0,
        acos: item.sales14d > 0 ? (item.cost / item.sales14d) * 100 : 999,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        conversionRate: item.clicks > 0 ? ((item.attributedConversions14d || 0) / item.clicks) * 100 : 0,
      }));
    } catch (error) {
      this.logger.warn(`Fehler beim Abrufen des Search Term Reports für Kampagne ${campaignId}:`, error.message);
      return [];
    }
  }

  /**
   * 🚫 Negative Keywords automatisch hinzufügen
   */
  private async addNegativeKeywords(
    campaignId: string,
    searchTerms: KeywordPerformance[],
  ): Promise<number> {
    let count = 0;

    const badKeywords = searchTerms.filter(
      (term) =>
        (term.acos > 60 && term.clicks >= 5) ||
        (term.clicks >= 20 && term.sales === 0) ||
        (term.impressions >= 1000 && term.ctr < 0.1),
    );

    this.logger.log(`🚫 Füge ${badKeywords.length} negative Keywords hinzu...`);

    for (const keyword of badKeywords) {
      try {
        await this.amazonClient.post('/sp/negativeKeywords', {
          campaignId: campaignId,
          adGroupId: keyword.adGroupId,
          keywordText: keyword.keyword,
          matchType: 'NEGATIVE_PHRASE',
          state: 'enabled',
        });

        await this.prisma.keywordOptimization.create({
          data: {
            campaignId: campaignId,
            keyword: keyword.keyword,
            action: 'NEGATIVE_ADDED',
            reason: `ACoS: ${keyword.acos.toFixed(1)}%, Clicks: ${keyword.clicks}, Sales: ${keyword.sales}`,
            previousAcos: keyword.acos,
            optimizedAt: new Date(),
          },
        });

        count++;
        this.logger.log(`  ✅ Negativ: "${keyword.keyword}" (ACoS: ${keyword.acos.toFixed(1)}%)`);
      } catch (error) {
        this.logger.warn(`  ⚠️ Konnte negatives Keyword nicht hinzufügen: ${keyword.keyword}`);
      }
    }

    return count;
  }

  /**
   * ✅ Positive Keywords automatisch erstellen
   */
  private async addPositiveKeywords(
    campaignId: string,
    searchTerms: KeywordPerformance[],
  ): Promise<number> {
    let count = 0;

    const goodKeywords = searchTerms.filter(
      (term) => term.acos < 15 && term.sales >= 3 && term.ctr > 0.5 && term.conversionRate > 5,
    );

    this.logger.log(`✅ Erstelle ${goodKeywords.length} positive Keywords...`);

    for (const keyword of goodKeywords) {
      try {
        const existing = await this.amazonClient.get<any[]>(
          `/sp/keywords?campaignIdFilter=${campaignId}&keywordText=${encodeURIComponent(keyword.keyword)}`,
        );

        if (existing && existing.length > 0) {
          this.logger.log(`  ⏭️ Keyword existiert bereits: "${keyword.keyword}"`);
          continue;
        }

        const optimalBid = this.calculateOptimalBid(keyword);

        await this.amazonClient.post('/sp/keywords', {
          campaignId: campaignId,
          adGroupId: keyword.adGroupId,
          keywordText: keyword.keyword,
          matchType: 'EXACT',
          state: 'enabled',
          bid: optimalBid,
        });

        await this.prisma.keywordOptimization.create({
          data: {
            campaignId: campaignId,
            keyword: keyword.keyword,
            action: 'POSITIVE_ADDED',
            reason: `ACoS: ${keyword.acos.toFixed(1)}%, Sales: ${keyword.sales}, CTR: ${keyword.ctr.toFixed(2)}%`,
            previousAcos: keyword.acos,
            newBid: optimalBid,
            optimizedAt: new Date(),
          },
        });

        count++;
        this.logger.log(`  ✅ Positiv: "${keyword.keyword}" (ACoS: ${keyword.acos.toFixed(1)}%, Gebot: €${optimalBid.toFixed(2)})`);
      } catch (error) {
        this.logger.warn(`  ⚠️ Konnte positives Keyword nicht erstellen: ${keyword.keyword}`);
      }
    }

    return count;
  }

  /**
   * ⏸️ Schlecht performende Keywords pausieren
   */
  private async pauseBadKeywords(campaignId: string): Promise<number> {
    let count = 0;

    try {
      const keywords = await this.amazonClient.get<any[]>(
        `/sp/keywords?campaignIdFilter=${campaignId}&stateFilter=enabled`,
      );

      for (const keyword of keywords) {
        const performance = await this.getKeywordPerformance(keyword.keywordId, 30);

        if ((performance.acos > 60 && performance.clicks >= 10) || (performance.clicks >= 30 && performance.sales === 0)) {
          await this.amazonClient.put(`/sp/keywords/${keyword.keywordId}`, {
            state: 'paused',
          });

          await this.prisma.keywordOptimization.create({
            data: {
              campaignId: campaignId,
              keyword: keyword.keywordText,
              action: 'PAUSED',
              reason: `Schlechte Performance: ACoS ${performance.acos.toFixed(1)}%, ${performance.clicks} Klicks, ${performance.sales} Sales`,
              previousAcos: performance.acos,
              optimizedAt: new Date(),
            },
          });

          count++;
          this.logger.log(`  ⏸️ Pausiert: "${keyword.keywordText}" (ACoS: ${performance.acos.toFixed(1)}%)`);
        }
      }
    } catch (error) {
      this.logger.warn('⚠️ Fehler beim Pausieren von Keywords:', error.message);
    }

    return count;
  }

  /**
   * 💰 Gebote basierend auf Performance anpassen
   */
  private async adjustBids(campaignId: string): Promise<number> {
    let count = 0;

    try {
      const keywords = await this.amazonClient.get<any[]>(
        `/sp/keywords?campaignIdFilter=${campaignId}&stateFilter=enabled`,
      );

      for (const keyword of keywords) {
        const performance = await this.getKeywordPerformance(keyword.keywordId, 14);
        const currentBid = keyword.bid;
        const newBid = this.calculateOptimalBid(performance);
        const changePercent = Math.abs((newBid - currentBid) / currentBid) * 100;

        if (changePercent > 10) {
          await this.amazonClient.put(`/sp/keywords/${keyword.keywordId}`, {
            bid: newBid,
          });

          await this.prisma.keywordOptimization.create({
            data: {
              campaignId: campaignId,
              keyword: keyword.keywordText,
              action: 'BID_ADJUSTED',
              reason: `ACoS: ${performance.acos.toFixed(1)}%`,
              previousBid: currentBid,
              newBid: newBid,
              previousAcos: performance.acos,
              optimizedAt: new Date(),
            },
          });

          count++;
          this.logger.log(`  💰 Gebot angepasst: "${keyword.keywordText}" (${currentBid.toFixed(2)} → ${newBid.toFixed(2)} €)`);
        }
      }
    } catch (error) {
      this.logger.warn('⚠️ Fehler beim Anpassen von Geboten:', error.message);
    }

    return count;
  }

  /**
   * 🧮 Berechne optimales Gebot basierend auf Performance
   */
  private calculateOptimalBid(performance: KeywordPerformance): number {
    const { acos, conversionRate, clicks, spend } = performance;

    let bidMultiplier = 1.0;

    if (acos < 10 && conversionRate > 10) {
      bidMultiplier = 1.3;
    } else if (acos < 15 && conversionRate > 5) {
      bidMultiplier = 1.15;
    } else if (acos < 25) {
      bidMultiplier = 1.0;
    } else if (acos < 40) {
      bidMultiplier = 0.85;
    } else {
      bidMultiplier = 0.7;
    }

    const currentCpc = clicks > 0 ? spend / clicks : 0.5;
    let newBid = currentCpc * bidMultiplier;
    newBid = Math.max(0.15, Math.min(5.0, newBid));

    return Math.round(newBid * 100) / 100;
  }

  /**
   * 📊 Hole Keyword-Performance
   */
  private async getKeywordPerformance(keywordId: string, days: number): Promise<KeywordPerformance> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const report = await this.amazonClient.post<any>(
        '/sp/keywords/report',
        {
          keywordIdFilter: [keywordId],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          metrics: ['impressions', 'clicks', 'cost', 'sales'],
        },
      );

      if (!report || report.length === 0) {
        return {
          keywordId,
          keyword: '',
          campaignId: '',
          adGroupId: '',
          impressions: 0,
          clicks: 0,
          spend: 0,
          sales: 0,
          acos: 999,
          ctr: 0,
          conversionRate: 0,
        };
      }

      const data = report[0];
      return {
        keywordId,
        keyword: data.keywordText || '',
        campaignId: data.campaignId,
        adGroupId: data.adGroupId,
        impressions: data.impressions,
        clicks: data.clicks,
        spend: data.cost,
        sales: data.sales14d || 0,
        acos: data.sales14d > 0 ? (data.cost / data.sales14d) * 100 : 999,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        conversionRate: data.clicks > 0 ? ((data.attributedConversions14d || 0) / data.clicks) * 100 : 0,
      };
    } catch (error) {
      this.logger.warn(`Fehler beim Abrufen der Keyword-Performance für ${keywordId}:`, error.message);
      return {
        keywordId,
        keyword: '',
        campaignId: '',
        adGroupId: '',
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        acos: 999,
        ctr: 0,
        conversionRate: 0,
      };
    }
  }

  /**
   * 💾 Speichere Optimierungs-Report
   */
  private async saveOptimizationReport(results: any): Promise<void> {
    await this.prisma.optimizationRun.create({
      data: {
        type: 'KEYWORD_OPTIMIZATION',
        negativeKeywordsAdded: results.negativeKeywordsAdded,
        positiveKeywordsAdded: results.positiveKeywordsAdded,
        keywordsPaused: results.keywordsPaused,
        bidsAdjusted: results.bidsAdjusted,
        executedAt: new Date(),
      },
    });
  }

  /**
   * 📊 Hole Optimierungs-Historie
   */
  async getOptimizationHistory(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.keywordOptimization.findMany({
      where: {
        optimizedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        optimizedAt: 'desc',
      },
    });
  }
}
