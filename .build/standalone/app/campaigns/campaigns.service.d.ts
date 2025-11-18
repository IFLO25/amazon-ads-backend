import { PrismaService } from '../prisma/prisma.service';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';
export declare class CampaignsService {
    private readonly prisma;
    private readonly amazonApi;
    private readonly logger;
    constructor(prisma: PrismaService, amazonApi: AmazonApiClient);
    syncCampaignsFromAmazon(): Promise<void>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    findByCampaignId(campaignId: string): Promise<any>;
    getPerformanceMetrics(id: string, days?: number): Promise<{
        campaign: {
            id: any;
            campaign_id: any;
            name: any;
            status: any;
            target_acos: any;
            current_acos: any;
        };
        period: {
            days: number;
            startDate: Date;
            endDate: Date;
        };
        metrics: {
            impressions: any;
            clicks: any;
            spend: any;
            sales: any;
            conversions: any;
            acos: number;
            ctr: number;
            conversionRate: number;
            cpc: number;
            roas: number;
        };
        dailyMetrics: any;
    }>;
    updateCampaign(campaignId: string, updates: {
        status?: string;
        budget?: number;
    }): Promise<void>;
    syncPerformanceMetrics(): Promise<void>;
    private fetchCampaignMetrics;
    optimizeTargeting(campaignId: string): Promise<{
        targets_added: number;
        targets_paused: number;
        bids_adjusted: number;
    }>;
    private getTargetPerformance;
    private calculateOptimalTargetBid;
}
