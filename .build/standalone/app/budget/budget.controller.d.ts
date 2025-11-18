import { BudgetService } from './budget.service';
export declare class BudgetController {
    private readonly budgetService;
    constructor(budgetService: BudgetService);
    getCurrentBudget(): Promise<{
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
    getBudgetHistory(months?: string): Promise<any>;
    canSpendMore(): Promise<{
        canSpend: boolean;
        recommendedDailyBudget: number;
    }>;
}
