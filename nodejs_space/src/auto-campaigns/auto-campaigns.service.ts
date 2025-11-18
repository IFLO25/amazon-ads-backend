
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

@Injectable()
export class AutoCampaignsService {
  private readonly logger = new Logger(AutoCampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private amazonApi: AmazonApiClient,
  ) {}

  /**
   * Täglich um 5 Uhr: Neue Produkte erkennen und Kampagnen erstellen
   */
  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async createCampaignsForNewProducts(): Promise<void> {
    this.logger.log('🆕 Suche nach neuen Produkten...');

    try {
      // Hole alle Produkte vom Amazon (simuliert - wird später über API geholt)
      // const products = await this.amazonApi.getProducts();
      const products: any[] = []; // Wird aktiviert sobald API-Zugriff vorhanden
      
      if (!products || products.length === 0) {
        this.logger.log('Keine neuen Produkte gefunden - API noch nicht konfiguriert');
        return;
      }

      for (const product of products) {
        // Prüfe ob bereits Kampagne existiert
        const existingCampaign = await this.prisma.campaign.findFirst({
          where: {
            name: {
              contains: product.asin || product.sku,
            },
          },
        });

        if (existingCampaign) {
          continue; // Kampagne existiert bereits
        }

        // Erstelle neue Test-Kampagne
        await this.createTestCampaign(product);
      }

      this.logger.log('✅ Neue Produkt-Kampagnen erstellt');
    } catch (error) {
      this.logger.error('❌ Fehler beim Kampagnen-Erstellen:', error);
    }
  }

  /**
   * Erstelle Test-Kampagne für neues Produkt
   */
  private async createTestCampaign(product: any): Promise<void> {
    this.logger.log(`🆕 Erstelle Test-Kampagne für: ${product.name || product.asin}`);

    try {
      // Erstelle Sponsored Products Kampagne mit konservativem Budget
      const campaignName = `AUTO - ${product.name || product.asin} - Test`;
      
      const campaignData = {
        name: campaignName,
        campaignType: 'SPONSORED_PRODUCTS',
        targetingType: 'AUTO', // Auto-Targeting für Test
        dailyBudget: 15, // Konservatives Start-Budget
        bidding: {
          strategy: 'LEGACY_FOR_SALES',
        },
      };

      // Erstelle Kampagne über API (simuliert)
      const newCampaign = await this.prisma.campaign.create({
        data: {
          campaignId: `camp-${Date.now()}`,
          name: campaignName,
          campaignType: 'SPONSORED_PRODUCTS',
          targetingType: 'AUTO',
          status: 'ENABLED',
          budget: 15,
          state: 'ENABLED',
          lastUpdated: new Date(),
        },
      });

      this.logger.log(`✅ Test-Kampagne erstellt: ${newCampaign.name}`);

      // Erstelle initiale Keywords (automatisch gefunden)
      await this.createInitialKeywords(newCampaign.campaignId, product);
    } catch (error) {
      this.logger.error(`Fehler beim Erstellen der Kampagne:`, error);
    }
  }

  /**
   * Erstelle initiale Keywords für neue Kampagne
   */
  private async createInitialKeywords(campaignId: string, product: any): Promise<void> {
    // Extrahiere Keywords aus Produktnamen
    const productName = product.name || product.title || '';
    const potentialKeywords = this.extractKeywords(productName);

    for (const keywordText of potentialKeywords.slice(0, 10)) {
      try {
        await this.prisma.keyword.create({
          data: {
            keywordId: `kw-${Date.now()}-${Math.random()}`,
            campaignId,
            keywordText,
            matchType: 'BROAD',
            status: 'ENABLED',
            bid: 0.50, // Niedriges Start-Gebot
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            conversions: 0,
            lastUpdated: new Date(),
          },
        });

        this.logger.log(`  🎯 Keyword erstellt: "${keywordText}"`);
      } catch (error) {
        // Ignoriere Duplikate
      }
    }
  }

  /**
   * Extrahiere Keywords aus Produktnamen
   */
  private extractKeywords(productName: string): string[] {
    // Einfache Keyword-Extraktion
    const words = productName.toLowerCase().split(/\s+/);
    const keywords: string[] = [];

    // Einzelne Wörter
    keywords.push(...words.filter((w) => w.length > 3));

    // 2-Wort-Kombinationen
    for (let i = 0; i < words.length - 1; i++) {
      keywords.push(`${words[i]} ${words[i + 1]}`);
    }

    // 3-Wort-Kombinationen
    for (let i = 0; i < words.length - 2; i++) {
      keywords.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }

    // Entferne Duplikate
    return [...new Set(keywords)];
  }

  /**
   * Skaliere erfolgreiche Test-Kampagnen
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scaleSuccessfulCampaigns(): Promise<void> {
    this.logger.log('📈 Prüfe Test-Kampagnen zum Skalieren...');

    try {
      // Finde alle Auto-erstellten Test-Kampagnen
      const testCampaigns = await this.prisma.campaign.findMany({
        where: {
          name: {
            contains: 'AUTO - ',
          },
          status: 'ENABLED',
        },
      });

      for (const campaign of testCampaigns) {
        const performance = await this.evaluateCampaignPerformance(campaign.campaignId);

        if (performance.isSuccessful) {
          // Skaliere Budget
          const newBudget = Math.min(campaign.budget * 1.5, 100);
          await this.prisma.campaign.update({
            where: { campaignId: campaign.campaignId },
            data: {
              budget: newBudget,
              lastUpdated: new Date(),
            },
          });

          this.logger.log(`✅ Kampagne ${campaign.name} skaliert: Budget ${campaign.budget}€ → ${newBudget}€`);
        } else if (performance.isPoor) {
          // Pause schlechte Kampagnen
          await this.prisma.campaign.update({
            where: { campaignId: campaign.campaignId },
            data: {
              status: 'PAUSED',
              lastUpdated: new Date(),
            },
          });

          this.logger.log(`⏸️ Kampagne ${campaign.name} pausiert (schlechte Performance)`);
        }
      }

      this.logger.log('✅ Kampagnen-Skalierung abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler beim Skalieren:', error);
    }
  }

  /**
   * Bewerte Kampagnen-Performance
   */
  private async evaluateCampaignPerformance(campaignId: string): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: { gte: sevenDaysAgo },
      },
    });

    const spend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    const sales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
    const acos = sales > 0 ? (spend / sales) * 100 : 999;

    return {
      spend,
      sales,
      acos,
      isSuccessful: acos < 25 && sales > 100, // ACoS <25% und >100€ Sales
      isPoor: (acos > 60 && spend > 30) || (spend > 50 && sales < 10),
    };
  }
}
