import { ConfigService } from '@nestjs/config';
import { AmazonAuthService } from './amazon-auth.service';
import { AxiosRequestConfig } from 'axios';
export declare class AmazonApiClient {
    private readonly configService;
    private readonly authService;
    private readonly logger;
    private readonly axiosInstance;
    private readonly rateLimitDelay;
    private lastRequestTime;
    private requestCount;
    private readonly maxRequestsPerMinute;
    constructor(configService: ConfigService, authService: AmazonAuthService);
    private enforceRateLimit;
    private sleep;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    getCampaigns(stateFilter?: string): Promise<any[]>;
}
