
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

@Injectable()
export class KeywordResearchService {
  private readonly logger = new Logger(KeywordResearchService.name);

  // Blumenzwiebel-spezifische Basis-Keywords
  private readonly seedKeywords = [
    'blumenzwiebeln',
    'tulpenzwiebeln',
    'narzissen',
    'krokus',
    'hyazinthen',
    'dahlien',
    'gladiolen',
    'lilien',
    'frühjahrsblüher',
    'herbstpflanzung',
    'sommerblumen',
    'winterharte pflanzen',
  ];

  constructor(
    private prisma: PrismaService,
    private amazonApi: AmazonApiClient,
  ) {}

  /**
   * Wöchentlich: Neue Keywords recherchieren
   */
  @Cron('0 10 * * 1') // Montags um 10 Uhr
  async researchNewKeywords(): Promise<void> {
    this.logger.log('🔍 Starte automatische Keyword-Recherche...');

    try {
      const newKeywords: string[] = [];

      // 1. Von Best-Performern lernen
      const topKeywords = await this.getTopPerformingKeywords();
      for (const keyword of topKeywords) {
        const variations = this.generateKeywordVariations(keyword.keywordText);
        newKeywords.push(...variations);
      }

      // 2. Seed-Keywords erweitern
      for (const seed of this.seedKeywords) {
        const variations = this.generateKeywordVariations(seed);
        newKeywords.push(...variations);
      }

      // 3. Amazon Suggested Keywords (simuliert)
      const suggested = await this.getAmazonSuggestedKeywords();
      newKeywords.push(...suggested);

      // Deduplizieren
      const uniqueKeywords = [...new Set(newKeywords)];

      this.logger.log(`📊 ${uniqueKeywords.length} neue Keyword-Ideen gefunden`);

      // 4. Test-Keywords zu Kampagnen hinzufügen
      await this.addTestKeywordsToCampaigns(uniqueKeywords.slice(0, 50));

      this.logger.log('✅ Keyword-Recherche abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler bei Keyword-Recherche:', error);
    }
  }

  /**
   * Top-Performing Keywords abrufen
   */
  private async getTopPerformingKeywords(limit = 10): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.prisma.keyword.findMany({
      where: {
        lastUpdated: { gte: thirtyDaysAgo },
        sales: { gt: 50 },
      },
      orderBy: [
        { sales: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Keyword-Variationen generieren
   */
  private generateKeywordVariations(baseKeyword: string): string[] {
    const modifiers = [
      // Kaufintention
      'kaufen',
      'bestellen',
      'günstig',
      'angebot',
      'set',
      'mix',
      
      // Qualität
      'hochwertig',
      'premium',
      'winterhart',
      'mehrjährig',
      
      // Zeit
      'frühjahr',
      'herbst',
      'frühlingsblüher',
      
      // Menge
      'pack',
      '10er',
      '20er',
      '50er',
      
      // Farbe
      'bunt',
      'rot',
      'gelb',
      'weiß',
      'gemischt',
    ];

    const variations: string[] = [];

    // Basis + Modifier
    for (const modifier of modifiers) {
      variations.push(`${baseKeyword} ${modifier}`);
      variations.push(`${modifier} ${baseKeyword}`);
    }

    // Long-tail Kombinationen
    variations.push(`${baseKeyword} online kaufen`);
    variations.push(`${baseKeyword} günstig bestellen`);
    variations.push(`beste ${baseKeyword}`);
    variations.push(`${baseKeyword} set`);

    return variations;
  }

  /**
   * Amazon Suggested Keywords holen (simuliert)
   */
  private async getAmazonSuggestedKeywords(): Promise<string[]> {
    // In Produktion würde hier die Amazon Advertising API verwendet
    // Für Demo simulieren wir relevante Keywords
    return [
      'blumenzwiebeln winterhart mehrjährig',
      'tulpenzwiebeln mischung',
      'narzissen zwiebeln',
      'frühjahrsblüher set',
      'herbstpflanzung blumenzwiebeln',
      'bio blumenzwiebeln',
      'blumenzwiebeln geschenk',
    ];
  }

  /**
   * Test-Keywords zu Kampagnen hinzufügen
   */
  private async addTestKeywordsToCampaigns(keywords: string[]): Promise<void> {
    // Hole alle aktiven Sponsored Products Kampagnen
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ENABLED',
        campaignType: 'SPONSORED_PRODUCTS',
      },
      take: 3, // Zu den Top 3 Kampagnen hinzufügen
    });

    let addedCount = 0;

    for (const campaign of campaigns) {
      for (const keywordText of keywords.slice(0, 15)) {
        try {
          // Prüfe ob Keyword bereits existiert
          const existing = await this.prisma.keyword.findFirst({
            where: {
              campaignId: campaign.campaignId,
              keywordText,
            },
          });

          if (existing) continue;

          // Füge als Test-Keyword hinzu
          await this.prisma.keyword.create({
            data: {
              keywordId: `kw-research-${Date.now()}-${Math.random()}`,
              campaignId: campaign.campaignId,
              keywordText,
              matchType: 'PHRASE', // Phrase Match für Test
              status: 'ENABLED',
              bid: 0.40, // Niedriges Test-Gebot
              impressions: 0,
              clicks: 0,
              spend: 0,
              sales: 0,
              conversions: 0,
              lastUpdated: new Date(),
            },
          });

          addedCount++;
          this.logger.log(`  🆕 Keyword "${keywordText}" zu ${campaign.name} hinzugefügt`);
        } catch (error) {
          // Ignoriere Fehler (z.B. Duplikate)
        }
      }
    }

    this.logger.log(`✅ ${addedCount} Test-Keywords hinzugefügt`);
  }

  /**
   * Keyword-Performance analysieren
   */
  async analyzeKeywordOpportunities(): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: { gte: sevenDaysAgo },
      },
      orderBy: {
        impressions: 'desc',
      },
      take: 100,
    });

    // Kategorisiere Keywords
    const highPotential = keywords.filter((kw: any) => {
      const ctr = kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0;
      const acos = kw.sales > 0 ? (kw.spend / kw.sales) * 100 : 0;
      return ctr > 0.5 && acos < 30 && kw.sales > 0;
    });

    const needsImprovement = keywords.filter((kw: any) => {
      const ctr = kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0;
      return kw.impressions > 100 && ctr < 0.2;
    });

    return {
      totalAnalyzed: keywords.length,
      highPotential: {
        count: highPotential.length,
        keywords: highPotential.slice(0, 10).map((kw: any) => ({
          keyword: kw.keywordText,
          acos: kw.sales > 0 ? ((kw.spend / kw.sales) * 100).toFixed(2) : 0,
          sales: kw.sales,
        })),
      },
      needsImprovement: {
        count: needsImprovement.length,
        keywords: needsImprovement.slice(0, 10).map((kw: any) => ({
          keyword: kw.keywordText,
          impressions: kw.impressions,
          clicks: kw.clicks,
          ctr: ((kw.clicks / kw.impressions) * 100).toFixed(2),
        })),
      },
    };
  }
}
