import { ConfigService } from '@nestjs/config';
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
export declare class OptimizationService {
    private readonly prisma;
    private readonly configService;
    private readonly campaignsService;
    private readonly budgetService;
    private readonly keywordsService;
    private readonly logger;
    private isOptimizing;
    constructor(prisma: PrismaService, configService: ConfigService, campaignsService: CampaignsService, budgetService: BudgetService, keywordsService: KeywordsService);
    handleOptimizationCron(): Promise<void>;
    handleSyncCron(): Promise<void>;
    handleKeywordOptimizationCron(): Promise<void>;
    handleTargetingOptimizationCron(): Promise<void>;
    optimizeAllCampaigns(): Promise<OptimizationAction[]>;
    private optimizeCampaign;
    private pauseCampaign;
    private archiveCampaign;
    private enableCampaign;
    private scaleCampaign;
    private reduceBudget;
    private logOptimization;
    getOptimizationHistory(limit?: number): Promise<any>;
}
