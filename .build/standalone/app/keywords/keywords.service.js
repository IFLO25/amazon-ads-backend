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
var KeywordsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const amazon_api_client_1 = require("../amazon-auth/amazon-api.client");
let KeywordsService = KeywordsService_1 = class KeywordsService {
    prisma;
    amazonClient;
    logger = new common_1.Logger(KeywordsService_1.name);
    constructor(prisma, amazonClient) {
        this.prisma = prisma;
        this.amazonClient = amazonClient;
    }
    async optimizeAllKeywords() {
        this.logger.log('🎯 Starte vollautomatische Keyword-Optimierung...');
        const results = {
            negative_keywords_added: 0,
            positive_keywords_added: 0,
            keywords_paused: 0,
            bids_adjusted: 0,
        };
        try {
            const campaigns = await this.amazonClient.getCampaigns('enabled');
            for (const campaign of campaigns) {
                this.logger.log(`📊 Analysiere Kampagne: ${campaign.name}`);
                const searchTerms = await this.getSearchTermReport(campaign.campaignId, 30);
                const negatives = await this.addNegativeKeywords(campaign.campaignId, searchTerms);
                results.negative_keywords_added += negatives;
                const positives = await this.addPositiveKeywords(campaign.campaignId, searchTerms);
                results.positive_keywords_added += positives;
                const paused = await this.pauseBadKeywords(campaign.campaignId);
                results.keywords_paused += paused;
                const adjusted = await this.adjustBids(campaign.campaignId);
                results.bids_adjusted += adjusted;
            }
            await this.saveOptimizationReport(results);
            this.logger.log('✅ Keyword-Optimierung abgeschlossen!');
            return results;
        }
        catch (error) {
            this.logger.error('❌ Fehler bei Keyword-Optimierung:', error);
            throw error;
        }
    }
    async getSearchTermReport(campaignId, days) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const report = await this.amazonClient.post('/sp/searchTerms/report', {
                campaignIdFilter: [campaignId],
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                metrics: ['impressions', 'clicks', 'cost', 'sales', 'attributedConversions14d'],
            });
            return (report || []).map((item) => ({
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
        }
        catch (error) {
            this.logger.warn(`Fehler beim Abrufen des Search Term Reports für Kampagne ${campaignId}:`, error.message);
            return [];
        }
    }
    async addNegativeKeywords(campaignId, searchTerms) {
        let count = 0;
        const badKeywords = searchTerms.filter((term) => (term.acos > 60 && term.clicks >= 5) ||
            (term.clicks >= 20 && term.sales === 0) ||
            (term.impressions >= 1000 && term.ctr < 0.1));
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
                await this.prisma.keyword_optimization.create({
                    data: {
                        campaign_id: campaignId,
                        keyword: keyword.keyword,
                        action: 'NEGATIVE_ADDED',
                        reason: `ACoS: ${keyword.acos.toFixed(1)}%, Clicks: ${keyword.clicks}, Sales: ${keyword.sales}`,
                        previous_acos: keyword.acos,
                        optimized_at: new Date(),
                    },
                });
                count++;
                this.logger.log(`  ✅ Negativ: "${keyword.keyword}" (ACoS: ${keyword.acos.toFixed(1)}%)`);
            }
            catch (error) {
                this.logger.warn(`  ⚠️ Konnte negatives Keyword nicht hinzufügen: ${keyword.keyword}`);
            }
        }
        return count;
    }
    async addPositiveKeywords(campaignId, searchTerms) {
        let count = 0;
        const goodKeywords = searchTerms.filter((term) => term.acos < 15 && term.sales >= 3 && term.ctr > 0.5 && term.conversionRate > 5);
        this.logger.log(`✅ Erstelle ${goodKeywords.length} positive Keywords...`);
        for (const keyword of goodKeywords) {
            try {
                const existing = await this.amazonClient.get(`/sp/keywords?campaignIdFilter=${campaignId}&keywordText=${encodeURIComponent(keyword.keyword)}`);
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
                await this.prisma.keyword_optimization.create({
                    data: {
                        campaign_id: campaignId,
                        keyword: keyword.keyword,
                        action: 'POSITIVE_ADDED',
                        reason: `ACoS: ${keyword.acos.toFixed(1)}%, Sales: ${keyword.sales}, CTR: ${keyword.ctr.toFixed(2)}%`,
                        previous_acos: keyword.acos,
                        new_bid: optimalBid,
                        optimized_at: new Date(),
                    },
                });
                count++;
                this.logger.log(`  ✅ Positiv: "${keyword.keyword}" (ACoS: ${keyword.acos.toFixed(1)}%, Gebot: €${optimalBid.toFixed(2)})`);
            }
            catch (error) {
                this.logger.warn(`  ⚠️ Konnte positives Keyword nicht erstellen: ${keyword.keyword}`);
            }
        }
        return count;
    }
    async pauseBadKeywords(campaignId) {
        let count = 0;
        try {
            const keywords = await this.amazonClient.get(`/sp/keywords?campaignIdFilter=${campaignId}&stateFilter=enabled`);
            for (const keyword of keywords) {
                const performance = await this.getKeywordPerformance(keyword.keywordId, 30);
                if ((performance.acos > 60 && performance.clicks >= 10) || (performance.clicks >= 30 && performance.sales === 0)) {
                    await this.amazonClient.put(`/sp/keywords/${keyword.keywordId}`, {
                        state: 'paused',
                    });
                    await this.prisma.keyword_optimization.create({
                        data: {
                            campaign_id: campaignId,
                            keyword: keyword.keywordText,
                            action: 'PAUSED',
                            reason: `Schlechte Performance: ACoS ${performance.acos.toFixed(1)}%, ${performance.clicks} Klicks, ${performance.sales} Sales`,
                            previous_acos: performance.acos,
                            optimized_at: new Date(),
                        },
                    });
                    count++;
                    this.logger.log(`  ⏸️ Pausiert: "${keyword.keywordText}" (ACoS: ${performance.acos.toFixed(1)}%)`);
                }
            }
        }
        catch (error) {
            this.logger.warn('⚠️ Fehler beim Pausieren von Keywords:', error.message);
        }
        return count;
    }
    async adjustBids(campaignId) {
        let count = 0;
        try {
            const keywords = await this.amazonClient.get(`/sp/keywords?campaignIdFilter=${campaignId}&stateFilter=enabled`);
            for (const keyword of keywords) {
                const performance = await this.getKeywordPerformance(keyword.keywordId, 14);
                const currentBid = keyword.bid;
                const newBid = this.calculateOptimalBid(performance);
                const changePercent = Math.abs((newBid - currentBid) / currentBid) * 100;
                if (changePercent > 10) {
                    await this.amazonClient.put(`/sp/keywords/${keyword.keywordId}`, {
                        bid: newBid,
                    });
                    await this.prisma.keyword_optimization.create({
                        data: {
                            campaign_id: campaignId,
                            keyword: keyword.keywordText,
                            action: 'BID_ADJUSTED',
                            reason: `ACoS: ${performance.acos.toFixed(1)}%`,
                            previous_bid: currentBid,
                            new_bid: newBid,
                            previous_acos: performance.acos,
                            optimized_at: new Date(),
                        },
                    });
                    count++;
                    this.logger.log(`  💰 Gebot angepasst: "${keyword.keywordText}" (${currentBid.toFixed(2)} → ${newBid.toFixed(2)} €)`);
                }
            }
        }
        catch (error) {
            this.logger.warn('⚠️ Fehler beim Anpassen von Geboten:', error.message);
        }
        return count;
    }
    calculateOptimalBid(performance) {
        const { acos, conversionRate, clicks, spend } = performance;
        let bidMultiplier = 1.0;
        if (acos < 10 && conversionRate > 10) {
            bidMultiplier = 1.3;
        }
        else if (acos < 15 && conversionRate > 5) {
            bidMultiplier = 1.15;
        }
        else if (acos < 25) {
            bidMultiplier = 1.0;
        }
        else if (acos < 40) {
            bidMultiplier = 0.85;
        }
        else {
            bidMultiplier = 0.7;
        }
        const currentCpc = clicks > 0 ? spend / clicks : 0.5;
        let newBid = currentCpc * bidMultiplier;
        newBid = Math.max(0.15, Math.min(5.0, newBid));
        return Math.round(newBid * 100) / 100;
    }
    async getKeywordPerformance(keywordId, days) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const report = await this.amazonClient.post('/sp/keywords/report', {
                keywordIdFilter: [keywordId],
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                metrics: ['impressions', 'clicks', 'cost', 'sales'],
            });
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
        }
        catch (error) {
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
    async saveOptimizationReport(results) {
        await this.prisma.optimization_run.create({
            data: {
                type: 'KEYWORD_OPTIMIZATION',
                negative_keywords_added: results.negative_keywords_added,
                positive_keywords_added: results.positive_keywords_added,
                keywords_paused: results.keywords_paused,
                bids_adjusted: results.bids_adjusted,
                executed_at: new Date(),
            },
        });
    }
    async getOptimizationHistory(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return this.prisma.keyword_optimization.findMany({
            where: {
                optimized_at: {
                    gte: startDate,
                },
            },
            orderBy: {
                optimized_at: 'desc',
            },
        });
    }
};
exports.KeywordsService = KeywordsService;
exports.KeywordsService = KeywordsService = KeywordsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        amazon_api_client_1.AmazonApiClient])
], KeywordsService);
//# sourceMappingURL=keywords.service.js.map