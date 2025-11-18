import { PrismaService } from '../prisma/prisma.service';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';
export declare class KeywordsService {
    private prisma;
    private amazonClient;
    private readonly logger;
    constructor(prisma: PrismaService, amazonClient: AmazonApiClient);
    optimizeAllKeywords(): Promise<{
        negative_keywords_added: number;
        positive_keywords_added: number;
        keywords_paused: number;
        bids_adjusted: number;
    }>;
    private getSearchTermReport;
    private addNegativeKeywords;
    private addPositiveKeywords;
    private pauseBadKeywords;
    private adjustBids;
    private calculateOptimalBid;
    private getKeywordPerformance;
    private saveOptimizationReport;
    getOptimizationHistory(days?: number): Promise<any>;
}
