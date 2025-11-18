import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class AmazonAuthService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private accessToken;
    private tokenExpiresAt;
    constructor(configService: ConfigService, prisma: PrismaService);
    getAccessToken(): Promise<string>;
    private refreshAccessToken;
    private getStoredToken;
    private storeToken;
    isConfigured(): boolean;
    exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any>;
    getConfigStatus(): {
        configured: boolean;
        advertisingAccountId: string | undefined;
        marketplace: string | undefined;
        sellerId: string | undefined;
        hasValidToken: boolean;
        tokenExpiresAt: Date | null;
    };
}
