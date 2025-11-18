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
var CampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const amazon_api_client_1 = require("../amazon-auth/amazon-api.client");
let CampaignsService = CampaignsService_1 = class CampaignsService {
    prisma;
    amazonApi;
    logger = new common_1.Logger(CampaignsService_1.name);
    constructor(prisma, amazonApi) {
        this.prisma = prisma;
        this.amazonApi = amazonApi;
    }
    async syncCampaignsFromAmazon() {
        try {
            this.logger.log('Starting campaign sync from Amazon...');
            const campaigns = await this.amazonApi.get('/v2/sp/campaigns');
            this.logger.log(`Fetched ${campaigns.length} campaigns from Amazon`);
            for (const amazonCampaign of campaigns) {
                const existingCampaign = await this.prisma.campaign.findUnique({
                    where: { campaign_id: amazonCampaign.campaignId },
                });
                const campaignData = {
                    campaign_id: amazonCampaign.campaignId,
                    name: amazonCampaign.name,
                    status: amazonCampaign.state,
                    budget: amazonCampaign.budget?.budget || 0,
                    target_acos: existingCampaign?.target_acos || 15,
                };
                if (existingCampaign) {
                    await this.prisma.campaign.update({
                        where: { campaign_id: amazonCampaign.campaignId },
                        data: {
                            name: campaignData.name,
                            status: campaignData.status,
                            budget: campaignData.budget,
                            updated_at: new Date(),
                        },
                    });
                    this.logger.debug(`Updated campaign: ${amazonCampaign.name}`);
                }
                else {
                    await this.prisma.campaign.create({
                        data: campaignData,
                    });
                    this.logger.debug(`Created new campaign: ${amazonCampaign.name}`);
                }
            }
            this.logger.log('Campaign sync completed successfully');
        }
        catch (error) {
            this.logger.error('Failed to sync campaigns from Amazon', error.message);
            throw error;
        }
    }
    async findAll() {
        return this.prisma.campaign.findMany({
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: {
                performance_metrics: {
                    orderBy: { date: 'desc' },
                    take: 30,
                },
                optimization_history: {
                    orderBy: { timestamp: 'desc' },
                    take: 50,
                },
            },
        });
        if (!campaign) {
            throw new common_1.NotFoundException(`Campaign with ID ${id} not found`);
        }
        return campaign;
    }
    async findByCampaignId(campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { campaign_id: campaignId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException(`Campaign with Amazon ID ${campaignId} not found`);
        }
        return campaign;
    }
    async getPerformanceMetrics(id, days = 30) {
        const campaign = await this.findOne(id);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const metrics = await this.prisma.performance_metric.findMany({
            where: {
                campaign_id: campaign.campaign_id,
                date: {
                    gte: startDate,
                },
            },
            orderBy: { date: 'asc' },
        });
        const aggregated = metrics.reduce((acc, metric) => {
            acc.totalImpressions += metric.impressions;
            acc.totalClicks += metric.clicks;
            acc.totalSpend += metric.spend;
            acc.totalSales += metric.sales;
            acc.totalConversions += metric.conversions;
            return acc;
        }, {
            totalImpressions: 0,
            totalClicks: 0,
            totalSpend: 0,
            totalSales: 0,
            totalConversions: 0,
        });
        const avgAcos = aggregated.totalSales > 0 ? (aggregated.totalSpend / aggregated.totalSales) * 100 : 0;
        const ctr = aggregated.totalImpressions > 0 ? (aggregated.totalClicks / aggregated.totalImpressions) * 100 : 0;
        const conversionRate = aggregated.totalClicks > 0 ? (aggregated.totalConversions / aggregated.totalClicks) * 100 : 0;
        return {
            campaign: {
                id: campaign.id,
                campaign_id: campaign.campaign_id,
                name: campaign.name,
                status: campaign.status,
                target_acos: campaign.target_acos,
                current_acos: campaign.current_acos,
            },
            period: {
                days,
                startDate,
                endDate: new Date(),
            },
            metrics: {
                impressions: aggregated.totalImpressions,
                clicks: aggregated.totalClicks,
                spend: aggregated.totalSpend,
                sales: aggregated.totalSales,
                conversions: aggregated.totalConversions,
                acos: parseFloat(avgAcos.toFixed(2)),
                ctr: parseFloat(ctr.toFixed(2)),
                conversionRate: parseFloat(conversionRate.toFixed(2)),
                cpc: aggregated.totalClicks > 0 ? parseFloat((aggregated.totalSpend / aggregated.totalClicks).toFixed(2)) : 0,
                roas: aggregated.totalSpend > 0 ? parseFloat((aggregated.totalSales / aggregated.totalSpend).toFixed(2)) : 0,
            },
            dailyMetrics: metrics,
        };
    }
    async updateCampaign(campaignId, updates) {
        try {
            const amazonUpdates = {};
            if (updates.status) {
                amazonUpdates.state = updates.status;
            }
            if (updates.budget) {
                amazonUpdates.budget = {
                    budget: updates.budget,
                    budgetType: 'DAILY',
                };
            }
            await this.amazonApi.put(`/v2/sp/campaigns/${campaignId}`, amazonUpdates);
            await this.prisma.campaign.update({
                where: { campaign_id: campaignId },
                data: {
                    ...updates,
                    updated_at: new Date(),
                },
            });
            this.logger.log(`Updated campaign ${campaignId}`);
        }
        catch (error) {
            this.logger.error(`Failed to update campaign ${campaignId}`, error.message);
            throw error;
        }
    }
    async syncPerformanceMetrics() {
        try {
            this.logger.log('Starting performance metrics sync...');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            const campaigns = await this.prisma.campaign.findMany();
            for (const campaign of campaigns) {
                try {
                    const metrics = await this.fetchCampaignMetrics(campaign.campaign_id, dateStr);
                    await this.prisma.performance_metric.upsert({
                        where: {
                            campaign_id_date: {
                                campaign_id: campaign.campaign_id,
                                date: yesterday,
                            },
                        },
                        create: {
                            campaign_id: campaign.campaign_id,
                            date: yesterday,
                            impressions: metrics.impressions,
                            clicks: metrics.clicks,
                            spend: metrics.spend,
                            sales: metrics.sales,
                            conversions: metrics.conversions,
                            acos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null,
                        },
                        update: {
                            impressions: metrics.impressions,
                            clicks: metrics.clicks,
                            spend: metrics.spend,
                            sales: metrics.sales,
                            conversions: metrics.conversions,
                            acos: metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null,
                        },
                    });
                    const acos = metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null;
                    await this.prisma.campaign.update({
                        where: { campaign_id: campaign.campaign_id },
                        data: { current_acos: acos },
                    });
                    this.logger.debug(`Synced metrics for campaign: ${campaign.name}`);
                }
                catch (error) {
                    this.logger.error(`Failed to sync metrics for campaign ${campaign.name}`, error.message);
                }
            }
            this.logger.log('Performance metrics sync completed');
        }
        catch (error) {
            this.logger.error('Failed to sync performance metrics', error.message);
            throw error;
        }
    }
    async fetchCampaignMetrics(campaignId, date) {
        return {
            campaignId,
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            conversions: 0,
        };
    }
    async optimizeTargeting(campaignId) {
        this.logger.log(`🎯 Optimiere Targeting für Kampagne ${campaignId}...`);
        const results = {
            targets_added: 0,
            targets_paused: 0,
            bids_adjusted: 0,
        };
        try {
            const targets = await this.amazonApi.get(`/v2/sp/targets?campaignIdFilter=${campaignId}&stateFilter=enabled`);
            for (const target of targets) {
                const performance = await this.getTargetPerformance(target.targetId, 14);
                if (performance.acos > 60 && performance.clicks >= 10) {
                    await this.amazonApi.put(`/v2/sp/targets/${target.targetId}`, {
                        state: 'paused',
                    });
                    results.targets_paused++;
                    this.logger.log(`  ⏸️ Target pausiert: ACoS ${performance.acos.toFixed(1)}%`);
                }
                else if (performance.acos > 0 && performance.clicks >= 5) {
                    const newBid = this.calculateOptimalTargetBid(performance);
                    const currentBid = target.bid;
                    const changePercent = Math.abs((newBid - currentBid) / currentBid) * 100;
                    if (changePercent > 10) {
                        await this.amazonApi.put(`/v2/sp/targets/${target.targetId}`, {
                            bid: newBid,
                        });
                        results.bids_adjusted++;
                        this.logger.log(`  💰 Target-Gebot angepasst: ${currentBid.toFixed(2)} → ${newBid.toFixed(2)} €`);
                    }
                }
            }
            return results;
        }
        catch (error) {
            this.logger.error('Fehler beim Optimieren des Targetings:', error.message);
            return results;
        }
    }
    async getTargetPerformance(targetId, days) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const report = await this.amazonApi.post('/v2/sp/targets/report', {
                targetIdFilter: [targetId],
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                metrics: ['impressions', 'clicks', 'cost', 'sales'],
            });
            if (!report || report.length === 0) {
                return { acos: 999, clicks: 0, spend: 0, sales: 0 };
            }
            const data = report[0];
            return {
                acos: data.sales > 0 ? (data.cost / data.sales) * 100 : 999,
                clicks: data.clicks || 0,
                spend: data.cost || 0,
                sales: data.sales || 0,
            };
        }
        catch (error) {
            return { acos: 999, clicks: 0, spend: 0, sales: 0 };
        }
    }
    calculateOptimalTargetBid(performance) {
        let bidMultiplier = 1.0;
        if (performance.acos < 10) {
            bidMultiplier = 1.25;
        }
        else if (performance.acos < 15) {
            bidMultiplier = 1.1;
        }
        else if (performance.acos < 25) {
            bidMultiplier = 1.0;
        }
        else if (performance.acos < 40) {
            bidMultiplier = 0.85;
        }
        else {
            bidMultiplier = 0.7;
        }
        const currentCpc = performance.clicks > 0 ? performance.spend / performance.clicks : 0.5;
        let newBid = currentCpc * bidMultiplier;
        newBid = Math.max(0.15, Math.min(5.0, newBid));
        return Math.round(newBid * 100) / 100;
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = CampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        amazon_api_client_1.AmazonApiClient])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map