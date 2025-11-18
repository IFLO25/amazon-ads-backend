import { AmazonAuthService } from '../amazon-auth/amazon-auth.service';
import { ConfigService } from '@nestjs/config';
export declare class CredentialsDto {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}
export declare class ConfigController {
    private readonly amazonAuth;
    private readonly config;
    constructor(amazonAuth: AmazonAuthService, config: ConfigService);
    getStatus(): Promise<{
        system: {
            status: string;
            environment: string | undefined;
        };
        amazon: {
            configured: boolean;
            advertisingAccountId: string | undefined;
            marketplace: string | undefined;
            sellerId: string | undefined;
            hasValidToken: boolean;
            tokenExpiresAt: Date | null;
        };
        budget: {
            monthlyMin: number | undefined;
            monthlyMax: number | undefined;
        };
        acos: {
            targetMin: number | undefined;
            targetMax: number | undefined;
            pauseMin: number | undefined;
            pauseMax: number | undefined;
        };
    }>;
    setCredentials(credentials: CredentialsDto): Promise<{
        message: string;
        instructions: string[];
        currentStatus: string;
    }>;
}
