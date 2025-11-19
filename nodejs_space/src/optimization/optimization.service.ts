
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BudgetService } from '../budget/budget.service';
import { KeywordsService } from '../keywords/keywords.service';

export interface OptimizationAction {
  campaignId: string;
  campaignName: string;
  action: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

@Injectable()
export class OptimizationService implements OnModuleInit {
  private readonly logger = new Logger(OptimizationService.name);
  private isOptimizing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly campaignsService: CampaignsService,
    private readonly budgetService: BudgetService,
    private readonly keywordsService: KeywordsService,
  ) {}

  /**
   * 🚀 Run initial optimization on startup (DISABLED for MVP)
   */
  async onModuleInit() {
    this.logger.log('🚀 ========================================');
    this.logger.log('🚀 AMAZON ADS OPTIMIZER GESTARTET!');
    this.logger.log('🚀 ========================================');
    this.logger.log('⚠️  Auto-optimization disabled (MVP mode - DB not required)');
    this.logger.log('✅ API endpoints are ready to use!');
    return; // Skip auto-optimization for now
    
    // ORIGINAL CODE - DISABLED FOR MVP:
    /*
    // Wait 5 seconds for all modules to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.logger.log('🔄 Starte initiale Amazon API Verbindung...');
    
    try {
      // Sync campaigns from Amazon
      this.logger.log('📥 Lade Kampagnen von Amazon...');
      await this.campaignsService.syncCampaignsFromAmazon();
      this.logger.log('✅ Kampagnen erfolgreich geladen!');
      
      // Sync performance metrics
      this.logger.log('📊 Lade Performance-Metriken...');
      await this.campaignsService.syncPerformanceMetrics();
      this.logger.log('✅ Performance-Metriken erfolgreich geladen!');
      
      // Run initial optimization
      this.logger.log('⚡ Starte initiale Optimierung...');
      const actions = await this.optimizeAllCampaigns();
      
      if (actions.length > 0) {
        this.logger.log('✅ Initiale Optimierung abgeschlossen!');
        this.logger.log(`   📊 ${actions.length} Optimierungen durchgeführt:`);
        actions.forEach(action => {
          this.logger.log(`   - ${action.campaignName}: ${action.action} (${action.reason})`);
        });
      } else {
        this.logger.log('✅ Initiale Optimierung abgeschlossen - keine Änderungen erforderlich');
      }
      
      // Run initial keyword optimization
      this.logger.log('🎯 Starte initiale Keyword-Optimierung...');
      const keywordResults = await this.keywordsService.optimizeAllKeywords();
      
      if (
        keywordResults.negativeKeywordsAdded > 0 ||
        keywordResults.positiveKeywordsAdded > 0 ||
        keywordResults.keywordsPaused > 0 ||
        keywordResults.bidsAdjusted > 0
      ) {
        this.logger.log('✅ Keyword-Optimierung abgeschlossen:');
        this.logger.log(`   🚫 Negative Keywords hinzugefügt: ${keywordResults.negativeKeywordsAdded}`);
        this.logger.log(`   ✅ Positive Keywords hinzugefügt: ${keywordResults.positiveKeywordsAdded}`);
        this.logger.log(`   ⏸️ Keywords pausiert: ${keywordResults.keywordsPaused}`);
        this.logger.log(`   💰 Gebote angepasst: ${keywordResults.bidsAdjusted}`);
      } else {
        this.logger.log('✅ Keyword-Optimierung abgeschlossen - keine Änderungen erforderlich');
      }
      
      this.logger.log('');
      this.logger.log('🎉 ========================================');
      this.logger.log('🎉 SYSTEM LÄUFT VOLLAUTOMATISCH!');
      this.logger.log('🎉 ========================================');
      this.logger.log('📅 Nächste Optimierung: In 1 Stunde');
      this.logger.log('🎯 Nächste Keyword-Optimierung: In 2 Stunden');
      this.logger.log('🎯 Nächste Targeting-Optimierung: In 3 Stunden');
      this.logger.log('');
      
    } catch (error) {
      this.logger.error('❌ Initiale Optimierung fehlgeschlagen:', error.message);
      this.logger.error('   Das System wird es beim nächsten Cron-Job erneut versuchen.');
    }
    */
  }

  /**
   * 🕐 Run optimization every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleOptimizationCron() {
    return; // Disabled for MVP (DB not required)
    this.logger.log('Starting scheduled optimization...');
    await this.optimizeAllCampaigns();
  }

  /**
   * 🕐 Sync campaigns and metrics every hour (offset by 30 minutes)
   */
  @Cron('30 * * * *')
  async handleSyncCron() {
    return; // Disabled for MVP (DB not required)
    this.logger.log('Starting scheduled sync...');
    try {
      await this.campaignsService.syncCampaignsFromAmazon();
      await this.campaignsService.syncPerformanceMetrics();
    } catch (error) {
      this.logger.error('Scheduled sync failed', error.message);
    }
  }

  /**
   * 🎯 Run keyword optimization every 2 hours
   */
  @Cron('0 */2 * * *')
  async handleKeywordOptimizationCron() {
    return; // Disabled for MVP (DB not required)
    this.logger.log('⚡ Starting scheduled keyword optimization...');
    try {
      const results = await this.keywordsService.optimizeAllKeywords();
      
      if (
        results.negativeKeywordsAdded > 0 ||
        results.positiveKeywordsAdded > 0 ||
        results.keywordsPaused > 0 ||
        results.bidsAdjusted > 0
      ) {
        this.logger.log('✅ Keyword optimization completed:');
        this.logger.log(`   🚫 Negative keywords added: ${results.negativeKeywordsAdded}`);
        this.logger.log(`   ✅ Positive keywords added: ${results.positiveKeywordsAdded}`);
        this.logger.log(`   ⏸️ Keywords paused: ${results.keywordsPaused}`);
        this.logger.log(`   💰 Bids adjusted: ${results.bidsAdjusted}`);
      } else {
        this.logger.log('✅ No keyword optimizations needed');
      }
    } catch (error) {
      this.logger.error('❌ Keyword optimization failed', error.message);
    }
  }

  /**
   * 🎯 Run targeting optimization every 3 hours
   */
  @Cron('0 */3 * * *')
  async handleTargetingOptimizationCron() {
    return; // Disabled for MVP (DB not required)
    this.logger.log('🎯 Starting scheduled targeting optimization...');
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'ENABLED',
        },
      });

      let totalTargetsPaused = 0;
      let totalBidsAdjusted = 0;

      for (const campaign of campaigns) {
        try {
          const results = await this.campaignsService.optimizeTargeting(campaign.campaignId);
          totalTargetsPaused += results.targets_paused;
          totalBidsAdjusted += results.bidsAdjusted;
        } catch (error) {
          this.logger.warn(`Failed to optimize targeting for campaign ${campaign.name}`, error.message);
        }
      }

      if (totalTargetsPaused > 0 || totalBidsAdjusted > 0) {
        this.logger.log('✅ Targeting optimization completed:');
        this.logger.log(`   ⏸️ Targets paused: ${totalTargetsPaused}`);
        this.logger.log(`   💰 Target bids adjusted: ${totalBidsAdjusted}`);
      } else {
        this.logger.log('✅ No targeting optimizations needed');
      }
    } catch (error) {
      this.logger.error('❌ Targeting optimization failed', error.message);
    }
  }

  /**
   * Optimize all campaigns based on ACoS and performance
   */
  async optimizeAllCampaigns(): Promise<OptimizationAction[]> {
    if (this.isOptimizing) {
      this.logger.warn('Optimization already in progress, skipping...');
      return [];
    }

    this.isOptimizing = true;
    const actions: OptimizationAction[] = [];

    try {
      // Check if we have budget remaining
      const budgetStatus = await this.budgetService.getCurrentMonthBudget();
      if (budgetStatus.remaining <= 0) {
        this.logger.warn('Monthly budget exhausted, skipping optimization');
        return actions;
      }

      // Get all active campaigns
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: {
            in: ['ENABLED', 'PAUSED'],
          },
        },
      });

      this.logger.log(`Optimizing ${campaigns.length} campaigns...`);

      for (const campaign of campaigns) {
        try {
          const action = await this.optimizeCampaign(campaign);
          if (action) {
            actions.push(action);
          }
        } catch (error) {
          this.logger.error(`Failed to optimize campaign ${campaign.name}`, error.message);
        }
      }

      this.logger.log(`Optimization completed. ${actions.length} actions taken.`);
      return actions;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize a single campaign
   */
  private async optimizeCampaign(campaign: any): Promise<OptimizationAction | null> {
    const { currentAcos, targetAcos, budget, status, campaignId, name } = campaign;

    // Skip if we don't have ACoS data yet
    if (currentAcos === null || currentAcos === undefined) {
      this.logger.debug(`No ACoS data for campaign ${name}, skipping...`);
      return null;
    }

    const targetMin = this.configService.get<number>('acos.targetMin') || 5;
    const targetMax = this.configService.get<number>('acos.targetMax') || 15;
    const pauseMin = this.configService.get<number>('acos.pauseMin') || 40;
    const pauseMax = this.configService.get<number>('acos.pauseMax') || 60;

    // Get last 7 days performance to ensure stable metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMetrics = await this.prisma.performanceMetric.findMany({
      where: {
        campaignId,
        date: { gte: sevenDaysAgo },
      },
    });

    // Skip if not enough data
    if (recentMetrics.length < 3) {
      this.logger.debug(`Not enough data for campaign ${name}, skipping...`);
      return null;
    }

    // Calculate average ACoS from recent data
    const totalSpend = recentMetrics.reduce((sum: number, m: any) => sum + m.spend, 0);
    const totalSales = recentMetrics.reduce((sum: number, m: any) => sum + m.sales, 0);
    const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

    // Decision logic based on ACoS
    if (avgAcos >= pauseMin && avgAcos <= pauseMax) {
      // PAUSE: Poor performance
      if (status === 'ENABLED') {
        return await this.pauseCampaign(campaign, avgAcos, 'ACoS too high');
      }
    } else if (avgAcos > pauseMax) {
      // ARCHIVE: Very poor performance
      return await this.archiveCampaign(campaign, avgAcos, 'ACoS critically high');
    } else if (avgAcos >= targetMin && avgAcos <= targetMax) {
      // SCALE: Great performance - increase budget
      return await this.scaleCampaign(campaign, avgAcos, 'ACoS within target range');
    } else if (avgAcos < targetMin) {
      // AGGRESSIVE SCALE: Excellent performance - increase budget more
      return await this.scaleCampaign(campaign, avgAcos, 'ACoS below target - excellent performance', true);
    } else if (avgAcos > targetMax && avgAcos < pauseMin) {
      // REDUCE: Moderate performance - decrease budget
      return await this.reduceBudget(campaign, avgAcos, 'ACoS above target but not critical');
    } else if (status === 'PAUSED' && avgAcos < targetMax) {
      // RE-ENABLE: Performance improved
      return await this.enableCampaign(campaign, avgAcos, 'ACoS improved');
    }

    return null;
  }

  /**
   * Pause a campaign
   */
  private async pauseCampaign(campaign: any, acos: number, reason: string): Promise<OptimizationAction> {
    this.logger.log(`Pausing campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);

    await this.campaignsService.updateCampaign(campaign.campaignId, {
      status: 'PAUSED',
    });

    await this.logOptimization(campaign.campaignId, 'PAUSE', 'ENABLED', 'PAUSED', reason);

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      action: 'PAUSE',
      oldValue: 'ENABLED',
      newValue: 'PAUSED',
      reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
    };
  }

  /**
   * Archive a campaign (permanent pause)
   */
  private async archiveCampaign(campaign: any, acos: number, reason: string): Promise<OptimizationAction> {
    this.logger.log(`Archiving campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);

    await this.campaignsService.updateCampaign(campaign.campaignId, {
      status: 'ARCHIVED',
    });

    await this.logOptimization(campaign.campaignId, 'ARCHIVE', campaign.status, 'ARCHIVED', reason);

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      action: 'ARCHIVE',
      oldValue: campaign.status,
      newValue: 'ARCHIVED',
      reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
    };
  }

  /**
   * Enable a paused campaign
   */
  private async enableCampaign(campaign: any, acos: number, reason: string): Promise<OptimizationAction> {
    this.logger.log(`Enabling campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);

    await this.campaignsService.updateCampaign(campaign.campaignId, {
      status: 'ENABLED',
    });

    await this.logOptimization(campaign.campaignId, 'ENABLE', 'PAUSED', 'ENABLED', reason);

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      action: 'ENABLE',
      oldValue: 'PAUSED',
      newValue: 'ENABLED',
      reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
    };
  }

  /**
   * Scale campaign budget (increase)
   */
  private async scaleCampaign(
    campaign: any,
    acos: number,
    reason: string,
    aggressive = false,
  ): Promise<OptimizationAction | null> {
    const increasePercent = aggressive ? 20 : 10;
    const newBudget = campaign.budget * (1 + increasePercent / 100);
    const maxDailyBudget = 100; // Maximum daily budget

    const finalBudget = Math.min(newBudget, maxDailyBudget);

    if (finalBudget === campaign.budget) {
      this.logger.debug(`Campaign ${campaign.name} already at max budget`);
      return null;
    }

    this.logger.log(
      `Scaling campaign ${campaign.name} budget: ${campaign.budget.toFixed(2)}€ → ${finalBudget.toFixed(2)}€ (ACoS: ${acos.toFixed(2)}%)`,
    );

    await this.campaignsService.updateCampaign(campaign.campaignId, {
      budget: finalBudget,
    });

    await this.logOptimization(
      campaign.campaignId,
      'BUDGET_INCREASE',
      campaign.budget.toFixed(2),
      finalBudget.toFixed(2),
      reason,
    );

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      action: 'BUDGET_INCREASE',
      oldValue: campaign.budget.toFixed(2),
      newValue: finalBudget.toFixed(2),
      reason: `${reason} (ACoS: ${acos.toFixed(2)}%, +${increasePercent}%)`,
    };
  }

  /**
   * Reduce campaign budget
   */
  private async reduceBudget(campaign: any, acos: number, reason: string): Promise<OptimizationAction | null> {
    const decreasePercent = 15;
    const newBudget = campaign.budget * (1 - decreasePercent / 100);
    const minDailyBudget = 5; // Minimum daily budget

    const finalBudget = Math.max(newBudget, minDailyBudget);

    if (finalBudget === campaign.budget) {
      this.logger.debug(`Campaign ${campaign.name} already at min budget`);
      return null;
    }

    this.logger.log(
      `Reducing campaign ${campaign.name} budget: ${campaign.budget.toFixed(2)}€ → ${finalBudget.toFixed(2)}€ (ACoS: ${acos.toFixed(2)}%)`,
    );

    await this.campaignsService.updateCampaign(campaign.campaignId, {
      budget: finalBudget,
    });

    await this.logOptimization(
      campaign.campaignId,
      'BUDGET_DECREASE',
      campaign.budget.toFixed(2),
      finalBudget.toFixed(2),
      reason,
    );

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      action: 'BUDGET_DECREASE',
      oldValue: campaign.budget.toFixed(2),
      newValue: finalBudget.toFixed(2),
      reason: `${reason} (ACoS: ${acos.toFixed(2)}%, -${decreasePercent}%)`,
    };
  }

  /**
   * Log optimization action to database
   */
  private async logOptimization(
    campaignId: string,
    action: string,
    oldValue: any,
    newValue: any,
    reason: string,
  ): Promise<void> {
    await this.prisma.optimizationHistory.create({
      data: {
        campaignId: campaignId,
        action,
        oldValue: String(oldValue),
        newValue: String(newValue),
        reason,
      },
    });

    // Update campaign's lastOptimized timestamp
    await this.prisma.campaign.update({
      where: { campaignId: campaignId },
      data: { lastOptimized: new Date() },
    });
  }

  /**
   * Get optimization history
   */
  async getOptimizationHistory(limit = 100) {
    return this.prisma.optimizationHistory.findMany({
      include: {
        campaign: {
          select: {
            name: true,
            campaignId: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
