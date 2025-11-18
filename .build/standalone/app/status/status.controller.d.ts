import { PrismaService } from '../prisma/prisma.service';
import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
export declare class StatusController {
    private readonly prisma;
    private readonly amazonAuth;
    constructor(prisma: PrismaService, amazonAuth: AmazonAuthService);
    getStatus(): Promise<{
        status: string;
        timestamp: Date;
        services: {
            database: {
                status: string;
                connected: boolean;
            };
            amazonApi: {
                status: string;
                configured: boolean;
            };
        };
        campaigns: {
            total: any;
            enabled: any;
            paused: any;
            archived: number;
        };
        optimization: {
            lastRun: any;
            totalActions: any;
        };
        performance: {
            today: {
                spend: any;
                sales: any;
                acos: number;
            };
        };
        error?: undefined;
    } | {
        status: string;
        timestamp: Date;
        error: any;
        services?: undefined;
        campaigns?: undefined;
        optimization?: undefined;
        performance?: undefined;
    }>;
    healthCheck(): Promise<{
        status: string;
        timestamp: Date;
    }>;
}
