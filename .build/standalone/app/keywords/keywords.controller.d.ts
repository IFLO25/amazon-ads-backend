import { KeywordsService } from './keywords.service';
export declare class KeywordsController {
    private readonly keywordsService;
    constructor(keywordsService: KeywordsService);
    optimizeKeywords(): Promise<{
        negative_keywords_added: number;
        positive_keywords_added: number;
        keywords_paused: number;
        bids_adjusted: number;
    }>;
    getHistory(days?: string): Promise<any>;
}
