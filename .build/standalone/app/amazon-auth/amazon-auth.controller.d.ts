import { AmazonAuthService } from './amazon-auth.service';
export declare class AmazonAuthController {
    private readonly amazonAuthService;
    constructor(amazonAuthService: AmazonAuthService);
    exchangeCodeForToken(body: {
        code: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    }): Promise<{
        success: boolean;
        message: string;
        refreshToken: any;
        accessToken: any;
        expiresIn: any;
    }>;
}
