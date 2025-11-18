"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OptimizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const campaigns_service_1 = require("../campaigns/campaigns.service");
const budget_service_1 = require("../budget/budget.service");
const keywords_service_1 = require("../keywords/keywords.service");
let OptimizationService = OptimizationService_1 = class OptimizationService {
    prisma;
    configService;
    campaignsService;
    budgetService;
    keywordsService;
    logger = new common_1.Logger(OptimizationService_1.name);
    isOptimizing = false;
    constructor(prisma, configService, campaignsService, budgetService, keywordsService) {
        this.prisma = prisma;
        this.configService = configService;
        this.campaignsService = campaignsService;
        this.budgetService = budgetService;
        this.keywordsService = keywordsService;
    }
    async handleOptimizationCron() {
        this.logger.log('Starting scheduled optimization...');
        await this.optimizeAllCampaigns();
    }
    async handleSyncCron() {
        this.logger.log('Starting scheduled sync...');
        try {
            await this.campaignsService.syncCampaignsFromAmazon();
            await this.campaignsService.syncPerformanceMetrics();
        }
        catch (error) {
            this.logger.error('Scheduled sync failed', error.message);
        }
    }
    async handleKeywordOptimizationCron() {
        this.logger.log('⚡ Starting scheduled keyword optimization...');
        try {
            const results = await this.keywordsService.optimizeAllKeywords();
            if (results.negative_keywords_added > 0 ||
                results.positive_keywords_added > 0 ||
                results.keywords_paused > 0 ||
                results.bids_adjusted > 0) {
                this.logger.log('✅ Keyword optimization completed:');
                this.logger.log(`   🚫 Negative keywords added: ${results.negative_keywords_added}`);
                this.logger.log(`   ✅ Positive keywords added: ${results.positive_keywords_added}`);
                this.logger.log(`   ⏸️ Keywords paused: ${results.keywords_paused}`);
                this.logger.log(`   💰 Bids adjusted: ${results.bids_adjusted}`);
            }
            else {
                this.logger.log('✅ No keyword optimizations needed');
            }
        }
        catch (error) {
            this.logger.error('❌ Keyword optimization failed', error.message);
        }
    }
    async handleTargetingOptimizationCron() {
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
                    const results = await this.campaignsService.optimizeTargeting(campaign.campaign_id);
                    totalTargetsPaused += results.targets_paused;
                    totalBidsAdjusted += results.bids_adjusted;
                }
                catch (error) {
                    this.logger.warn(`Failed to optimize targeting for campaign ${campaign.name}`, error.message);
                }
            }
            if (totalTargetsPaused > 0 || totalBidsAdjusted > 0) {
                this.logger.log('✅ Targeting optimization completed:');
                this.logger.log(`   ⏸️ Targets paused: ${totalTargetsPaused}`);
                this.logger.log(`   💰 Target bids adjusted: ${totalBidsAdjusted}`);
            }
            else {
                this.logger.log('✅ No targeting optimizations needed');
            }
        }
        catch (error) {
            this.logger.error('❌ Targeting optimization failed', error.message);
        }
    }
    async optimizeAllCampaigns() {
        if (this.isOptimizing) {
            this.logger.warn('Optimization already in progress, skipping...');
            return [];
        }
        this.isOptimizing = true;
        const actions = [];
        try {
            const budgetStatus = await this.budgetService.getCurrentMonthBudget();
            if (budgetStatus.remaining <= 0) {
                this.logger.warn('Monthly budget exhausted, skipping optimization');
                return actions;
            }
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
                }
                catch (error) {
                    this.logger.error(`Failed to optimize campaign ${campaign.name}`, error.message);
                }
            }
            this.logger.log(`Optimization completed. ${actions.length} actions taken.`);
            return actions;
        }
        finally {
            this.isOptimizing = false;
        }
    }
    async optimizeCampaign(campaign) {
        const { current_acos, target_acos, budget, status, campaign_id, name } = campaign;
        if (current_acos === null || current_acos === undefined) {
            this.logger.debug(`No ACoS data for campaign ${name}, skipping...`);
            return null;
        }
        const targetMin = this.configService.get('acos.targetMin') || 5;
        const targetMax = this.configService.get('acos.targetMax') || 15;
        const pauseMin = this.configService.get('acos.pauseMin') || 40;
        const pauseMax = this.configService.get('acos.pauseMax') || 60;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentMetrics = await this.prisma.performance_metric.findMany({
            where: {
                campaign_id,
                date: { gte: sevenDaysAgo },
            },
        });
        if (recentMetrics.length < 3) {
            this.logger.debug(`Not enough data for campaign ${name}, skipping...`);
            return null;
        }
        const totalSpend = recentMetrics.reduce((sum, m) => sum + m.spend, 0);
        const totalSales = recentMetrics.reduce((sum, m) => sum + m.sales, 0);
        const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
        if (avgAcos >= pauseMin && avgAcos <= pauseMax) {
            if (status === 'ENABLED') {
                return await this.pauseCampaign(campaign, avgAcos, 'ACoS too high');
            }
        }
        else if (avgAcos > pauseMax) {
            return await this.archiveCampaign(campaign, avgAcos, 'ACoS critically high');
        }
        else if (avgAcos >= targetMin && avgAcos <= targetMax) {
            return await this.scaleCampaign(campaign, avgAcos, 'ACoS within target range');
        }
        else if (avgAcos < targetMin) {
            return await this.scaleCampaign(campaign, avgAcos, 'ACoS below target - excellent performance', true);
        }
        else if (avgAcos > targetMax && avgAcos < pauseMin) {
            return await this.reduceBudget(campaign, avgAcos, 'ACoS above target but not critical');
        }
        else if (status === 'PAUSED' && avgAcos < targetMax) {
            return await this.enableCampaign(campaign, avgAcos, 'ACoS improved');
        }
        return null;
    }
    async pauseCampaign(campaign, acos, reason) {
        this.logger.log(`Pausing campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);
        await this.campaignsService.updateCampaign(campaign.campaign_id, {
            status: 'PAUSED',
        });
        await this.logOptimization(campaign.campaign_id, 'PAUSE', 'ENABLED', 'PAUSED', reason);
        return {
            campaignId: campaign.campaign_id,
            campaignName: campaign.name,
            action: 'PAUSE',
            oldValue: 'ENABLED',
            newValue: 'PAUSED',
            reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
        };
    }
    async archiveCampaign(campaign, acos, reason) {
        this.logger.log(`Archiving campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);
        await this.campaignsService.updateCampaign(campaign.campaign_id, {
            status: 'ARCHIVED',
        });
        await this.logOptimization(campaign.campaign_id, 'ARCHIVE', campaign.status, 'ARCHIVED', reason);
        return {
            campaignId: campaign.campaign_id,
            campaignName: campaign.name,
            action: 'ARCHIVE',
            oldValue: campaign.status,
            newValue: 'ARCHIVED',
            reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
        };
    }
    async enableCampaign(campaign, acos, reason) {
        this.logger.log(`Enabling campaign ${campaign.name} (ACoS: ${acos.toFixed(2)}%)`);
        await this.campaignsService.updateCampaign(campaign.campaign_id, {
            status: 'ENABLED',
        });
        await this.logOptimization(campaign.campaign_id, 'ENABLE', 'PAUSED', 'ENABLED', reason);
        return {
            campaignId: campaign.campaign_id,
            campaignName: campaign.name,
            action: 'ENABLE',
            oldValue: 'PAUSED',
            newValue: 'ENABLED',
            reason: `${reason} (ACoS: ${acos.toFixed(2)}%)`,
        };
    }
    async scaleCampaign(campaign, acos, reason, aggressive = false) {
        const increasePercent = aggressive ? 20 : 10;
        const newBudget = campaign.budget * (1 + increasePercent / 100);
        const maxDailyBudget = 100;
        const finalBudget = Math.min(newBudget, maxDailyBudget);
        if (finalBudget === campaign.budget) {
            this.logger.debug(`Campaign ${campaign.name} already at max budget`);
            return null;
        }
        this.logger.log(`Scaling campaign ${campaign.name} budget: ${campaign.budget.toFixed(2)}€ → ${finalBudget.toFixed(2)}€ (ACoS: ${acos.toFixed(2)}%)`);
        await this.campaignsService.updateCampaign(campaign.campaign_id, {
            budget: finalBudget,
        });
        await this.logOptimization(campaign.campaign_id, 'BUDGET_INCREASE', campaign.budget.toFixed(2), finalBudget.toFixed(2), reason);
        return {
            campaignId: campaign.campaign_id,
            campaignName: campaign.name,
            action: 'BUDGET_INCREASE',
            oldValue: campaign.budget.toFixed(2),
            newValue: finalBudget.toFixed(2),
            reason: `${reason} (ACoS: ${acos.toFixed(2)}%, +${increasePercent}%)`,
        };
    }
    async reduceBudget(campaign, acos, reason) {
        const decreasePercent = 15;
        const newBudget = campaign.budget * (1 - decreasePercent / 100);
        const minDailyBudget = 5;
        const finalBudget = Math.max(newBudget, minDailyBudget);
        if (finalBudget === campaign.budget) {
            this.logger.debug(`Campaign ${campaign.name} already at min budget`);
            return null;
        }
        this.logger.log(`Reducing campaign ${campaign.name} budget: ${campaign.budget.toFixed(2)}€ → ${finalBudget.toFixed(2)}€ (ACoS: ${acos.toFixed(2)}%)`);
        await this.campaignsService.updateCampaign(campaign.campaign_id, {
            budget: finalBudget,
        });
        await this.logOptimization(campaign.campaign_id, 'BUDGET_DECREASE', campaign.budget.toFixed(2), finalBudget.toFixed(2), reason);
        return {
            campaignId: campaign.campaign_id,
            campaignName: campaign.name,
            action: 'BUDGET_DECREASE',
            oldValue: campaign.budget.toFixed(2),
            newValue: finalBudget.toFixed(2),
            reason: `${reason} (ACoS: ${acos.toFixed(2)}%, -${decreasePercent}%)`,
        };
    }
    async logOptimization(campaignId, action, oldValue, newValue, reason) {
        await this.prisma.optimization_history.create({
            data: {
                campaign_id: campaignId,
                action,
                old_value: String(oldValue),
                new_value: String(newValue),
                reason,
            },
        });
        await this.prisma.campaign.update({
            where: { campaign_id: campaignId },
            data: { last_optimized: new Date() },
        });
    }
    async getOptimizationHistory(limit = 100) {
        return this.prisma.optimization_history.findMany({
            include: {
                campaign: {
                    select: {
                        name: true,
                        campaign_id: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
};
exports.OptimizationService = OptimizationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OptimizationService.prototype, "handleOptimizationCron", null);
__decorate([
    (0, schedule_1.Cron)('30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OptimizationService.prototype, "handleSyncCron", null);
__decorate([
    (0, schedule_1.Cron)('0 */2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OptimizationService.prototype, "handleKeywordOptimizationCron", null);
__decorate([
    (0, schedule_1.Cron)('0 */3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OptimizationService.prototype, "handleTargetingOptimizationCron", null);
exports.OptimizationService = OptimizationService = OptimizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        campaigns_service_1.CampaignsService,
        budget_service_1.BudgetService,
        keywords_service_1.KeywordsService])
], OptimizationService);
//# sourceMappingURL=optimization.service.js.map