import { CampaignsService } from './campaigns.service';
export declare class CampaignsController {
    private readonly campaignsService;
    constructor(campaignsService: CampaignsService);
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    getPerformance(id: string, days?: string): Promise<{
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
    syncCampaigns(): Promise<{
        message: string;
        timestamp: Date;
    }>;
    syncMetrics(): Promise<{
        message: string;
        timestamp: Date;
    }>;
}
