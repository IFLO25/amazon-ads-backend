
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Update budget tracking daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBudgetUpdate() {
    this.logger.log('Running daily budget update...');
    await this.updateBudgetTracking();
  }

  /**
   * Get current month budget status
   */
  async getCurrentMonthBudget() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let budgetTracking = await this.prisma.budgetTracking.findUnique({
      where: { month: monthStart },
    });

    if (!budgetTracking) {
      // Create new budget tracking entry for this month
      const totalBudget = this.configService.get<number>('budget.monthlyMax') || 2000;
      budgetTracking = await this.prisma.budgetTracking.create({
        data: {
          month: monthStart,
          totalBudget: totalBudget,
          spent: 0,
          remaining: totalBudget,
        },
      });
    }

    // Calculate actual spent from performance metrics
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const actualSpent = await this.calculateSpentInPeriod(monthStart, monthEnd);

    // Update if different
    if (Math.abs(actualSpent - budgetTracking.spent) > 0.01) {
      budgetTracking = await this.prisma.budgetTracking.update({
        where: { month: monthStart },
        data: {
          spent: actualSpent,
          remaining: budgetTracking.totalBudget - actualSpent,
        },
      });
    }

    const daysInMonth = monthEnd.getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    return {
      month: monthStart.toISOString().slice(0, 7),
      totalBudget: budgetTracking.totalBudget,
      spent: budgetTracking.spent,
      remaining: budgetTracking.remaining,
      percentUsed: (budgetTracking.spent / budgetTracking.totalBudget) * 100,
      averageDailySpend: daysElapsed > 0 ? budgetTracking.spent / daysElapsed : 0,
      projectedMonthlySpend: daysElapsed > 0 ? (budgetTracking.spent / daysElapsed) * daysInMonth : 0,
      daysElapsed,
      daysRemaining,
      budgetPerRemainingDay: daysRemaining > 0 ? budgetTracking.remaining / daysRemaining : 0,
    };
  }

  /**
   * Get budget history
   */
  async getBudgetHistory(months = 6) {
    const history = await this.prisma.budgetTracking.findMany({
      orderBy: { month: 'desc' },
      take: months,
    });

    return history.map((entry: any) => ({
      month: entry.month.toISOString().slice(0, 7),
      totalBudget: entry.totalBudget,
      spent: entry.spent,
      remaining: entry.remaining,
      percentUsed: (entry.spent / entry.totalBudget) * 100,
      underBudget: entry.remaining > 0,
    }));
  }

  /**
   * Update budget tracking with actual spend
   */
  private async updateBudgetTracking() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const totalSpent = await this.calculateSpentInPeriod(monthStart, monthEnd);

    let budgetTracking = await this.prisma.budgetTracking.findUnique({
      where: { month: monthStart },
    });

    if (!budgetTracking) {
      const totalBudget = this.configService.get<number>('budget.monthlyMax') || 2000;
      budgetTracking = await this.prisma.budgetTracking.create({
        data: {
          month: monthStart,
          totalBudget: totalBudget,
          spent: totalSpent,
          remaining: totalBudget - totalSpent,
        },
      });
      this.logger.log(`Created budget tracking for ${monthStart.toISOString().slice(0, 7)}`);
    } else {
      await this.prisma.budgetTracking.update({
        where: { month: monthStart },
        data: {
          spent: totalSpent,
          remaining: budgetTracking.totalBudget - totalSpent,
        },
      });
      this.logger.log(
        `Updated budget tracking: ${totalSpent.toFixed(2)}€ / ${budgetTracking.totalBudget}€`,
      );
    }

    // Check if budget exceeded
    if (totalSpent >= budgetTracking.totalBudget) {
      this.logger.warn('⚠️  Monthly budget exceeded!');
    }
  }

  /**
   * Calculate total spend in a period
   */
  private async calculateSpentInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const metrics = await this.prisma.performanceMetric.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return metrics.reduce((sum: number, metric: any) => sum + metric.spend, 0);
  }

  /**
   * Check if we can spend more this month
   */
  async canSpendMore(): Promise<boolean> {
    const budgetStatus = await this.getCurrentMonthBudget();
    return budgetStatus.remaining > 0;
  }

  /**
   * Get recommended daily budget based on remaining budget
   */
  async getRecommendedDailyBudget(): Promise<number> {
    const budgetStatus = await this.getCurrentMonthBudget();
    
    if (budgetStatus.daysRemaining <= 0) {
      return 0;
    }

    return budgetStatus.budgetPerRemainingDay;
  }

  /**
   * 🤖 INTELLIGENTE BUDGET-UMVERTEILUNG
   * Täglich um 3 Uhr: Budget von schlechten zu guten Kampagnen verschieben
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async redistributeBudget(): Promise<void> {
    this.logger.log('💰 Starte intelligente Budget-Umverteilung...');

    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: { status: 'ENABLED' },
      });

      // Performance der letzten 7 Tage analysieren
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const campaignPerformance = await Promise.all(
        campaigns.map(async (campaign: any) => {
          const metrics = await this.calculateCampaignPerformance(campaign.campaignId, sevenDaysAgo);
          return {
            campaign,
            ...metrics,
          };
        }),
      );

      // Sortiere nach Performance (niedriger ACoS = besser)
      campaignPerformance.sort((a, b) => a.acos - b.acos);

      // Kategorisiere Kampagnen
      const excellent = campaignPerformance.filter((cp) => cp.acos < 10 && cp.sales > 50);
      const good = campaignPerformance.filter((cp) => cp.acos >= 10 && cp.acos < 20 && cp.sales > 20);
      const average = campaignPerformance.filter((cp) => cp.acos >= 20 && cp.acos < 35);
      const poor = campaignPerformance.filter((cp) => cp.acos >= 35 || (cp.spend > 50 && cp.sales < 10));

      this.logger.log(`📊 Kampagnen-Kategorien:`);
      this.logger.log(`  ⭐ Exzellent (ACoS <10%): ${excellent.length}`);
      this.logger.log(`  ✅ Gut (ACoS 10-20%): ${good.length}`);
      this.logger.log(`  ⚠️  Durchschnittlich (ACoS 20-35%): ${average.length}`);
      this.logger.log(`  ❌ Schlecht (ACoS >35%): ${poor.length}`);

      // Budget-Umverteilung
      for (const cp of excellent) {
        // Erhöhe Budget um 50%
        const newBudget = Math.min((cp.campaign.budget || 50) * 1.5, 200);
        await this.updateCampaignBudget(cp.campaign.campaignId, newBudget);
        this.logger.log(`  💎 ${cp.campaign.name}: Budget erhöht auf ${newBudget}€ (ACoS: ${cp.acos.toFixed(1)}%)`);
      }

      for (const cp of good) {
        // Erhöhe Budget um 25%
        const newBudget = Math.min((cp.campaign.budget || 50) * 1.25, 150);
        await this.updateCampaignBudget(cp.campaign.campaignId, newBudget);
        this.logger.log(`  ✅ ${cp.campaign.name}: Budget erhöht auf ${newBudget}€ (ACoS: ${cp.acos.toFixed(1)}%)`);
      }

      for (const cp of average) {
        // Budget unverändert lassen
        this.logger.log(`  ⚠️  ${cp.campaign.name}: Budget unverändert bei ${cp.campaign.budget}€ (ACoS: ${cp.acos.toFixed(1)}%)`);
      }

      for (const cp of poor) {
        // Reduziere Budget um 50%
        const newBudget = Math.max((cp.campaign.budget || 50) * 0.5, 10);
        await this.updateCampaignBudget(cp.campaign.campaignId, newBudget);
        this.logger.log(`  ❌ ${cp.campaign.name}: Budget reduziert auf ${newBudget}€ (ACoS: ${cp.acos.toFixed(1)}%)`);
      }

      this.logger.log('✅ Budget-Umverteilung abgeschlossen');
    } catch (error) {
      this.logger.error('❌ Fehler bei Budget-Umverteilung:', error);
    }
  }

  /**
   * Berechne Kampagnen-Performance
   */
  private async calculateCampaignPerformance(campaignId: string, since: Date): Promise<any> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: { gte: since },
      },
    });

    const spend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    const sales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
    const conversions = keywords.reduce((sum: any, kw: any) => sum + (kw.conversions || 0), 0);
    const acos = sales > 0 ? (spend / sales) * 100 : 999;

    return { spend, sales, conversions, acos };
  }

  /**
   * Update Kampagnen-Budget
   */
  private async updateCampaignBudget(campaignId: string, newBudget: number): Promise<void> {
    await this.prisma.campaign.update({
      where: { campaignId },
      data: {
        budget: newBudget,
        lastUpdated: new Date(),
      },
    });
  }
}
