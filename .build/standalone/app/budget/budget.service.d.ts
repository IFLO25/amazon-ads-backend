import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class BudgetService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    handleDailyBudgetUpdate(): Promise<void>;
    getCurrentMonthBudget(): Promise<{
        month: string;
        totalBudget: any;
        spent: any;
        remaining: any;
        percentUsed: number;
        averageDailySpend: number;
        projectedMonthlySpend: number;
        daysElapsed: number;
        daysRemaining: number;
        budgetPerRemainingDay: number;
    }>;
    getBudgetHistory(months?: number): Promise<any>;
    private updateBudgetTracking;
    private calculateSpentInPeriod;
    canSpendMore(): Promise<boolean>;
    getRecommendedDailyBudget(): Promise<number>;
}
