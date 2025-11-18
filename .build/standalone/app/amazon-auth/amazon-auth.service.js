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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AmazonAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let AmazonAuthService = AmazonAuthService_1 = class AmazonAuthService {
    configService;
    prisma;
    logger = new common_1.Logger(AmazonAuthService_1.name);
    accessToken = null;
    tokenExpiresAt = null;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
    }
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
            return this.accessToken;
        }
        const storedToken = await this.getStoredToken();
        if (storedToken && new Date() < storedToken.expires_at) {
            this.accessToken = storedToken.access_token;
            this.tokenExpiresAt = storedToken.expires_at;
            this.logger.log('Using stored access token from database');
            return this.accessToken;
        }
        this.logger.log('Access token expired or missing, refreshing...');
        return await this.refreshAccessToken();
    }
    async refreshAccessToken() {
        const clientId = this.configService.get('amazon.clientId');
        const clientSecret = this.configService.get('amazon.clientSecret');
        const refreshToken = this.configService.get('amazon.refreshToken');
        const tokenEndpoint = this.configService.get('amazon.tokenEndpoint');
        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Amazon API credentials not configured. Please set AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, and AMAZON_REFRESH_TOKEN in .env file');
        }
        try {
            const response = await axios_1.default.post(tokenEndpoint, new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const data = response.data;
            const { access_token, expires_in, refresh_token: newRefreshToken } = data;
            const expiresAt = new Date(Date.now() + (expires_in - 300) * 1000);
            this.accessToken = access_token;
            this.tokenExpiresAt = expiresAt;
            await this.storeToken(access_token, newRefreshToken || refreshToken, expiresAt);
            this.logger.log('Access token refreshed successfully');
            return access_token;
        }
        catch (error) {
            this.logger.error('Failed to refresh access token', error.response?.data || error.message);
            throw new Error('Failed to refresh Amazon access token');
        }
    }
    async getStoredToken() {
        const tokens = await this.prisma.token_storage.findMany({
            orderBy: { created_at: 'desc' },
            take: 1,
        });
        return tokens.length > 0 ? tokens[0] : null;
    }
    async storeToken(accessToken, refreshToken, expiresAt) {
        await this.prisma.token_storage.deleteMany({});
        await this.prisma.token_storage.create({
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt,
            },
        });
    }
    isConfigured() {
        const clientId = this.configService.get('amazon.clientId');
        const clientSecret = this.configService.get('amazon.clientSecret');
        const refreshToken = this.configService.get('amazon.refreshToken');
        return !!(clientId &&
            clientSecret &&
            refreshToken &&
            clientId !== 'your_client_id_here' &&
            clientSecret !== 'your_client_secret_here' &&
            refreshToken !== 'your_refresh_token_here');
    }
    async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
        try {
            const response = await axios_1.default.post('https://api.amazon.com/auth/o2/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            this.logger.log('Successfully exchanged code for tokens');
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
            throw error;
        }
    }
    getConfigStatus() {
        const isConfigured = this.isConfigured();
        const advertisingAccountId = this.configService.get('amazon.advertisingAccountId');
        const marketplace = this.configService.get('amazon.marketplace');
        const sellerId = this.configService.get('amazon.sellerId');
        return {
            configured: isConfigured,
            advertisingAccountId,
            marketplace,
            sellerId,
            hasValidToken: !!this.accessToken && !!this.tokenExpiresAt && new Date() < this.tokenExpiresAt,
            tokenExpiresAt: this.tokenExpiresAt,
        };
    }
};
exports.AmazonAuthService = AmazonAuthService;
exports.AmazonAuthService = AmazonAuthService = AmazonAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AmazonAuthService);
//# sourceMappingURL=amazon-auth.service.js.map