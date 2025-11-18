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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = exports.CredentialsDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const amazon_auth_service_1 = require("../amazon-auth/amazon-auth.service");
const config_1 = require("@nestjs/config");
class CredentialsDto {
    clientId;
    clientSecret;
    refreshToken;
}
exports.CredentialsDto = CredentialsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'amzn1.application-oa2-client.abc123', description: 'Amazon API Client ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CredentialsDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'your_client_secret', description: 'Amazon API Client Secret' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CredentialsDto.prototype, "clientSecret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Atzr|IwEBIA...', description: 'Amazon API Refresh Token' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CredentialsDto.prototype, "refreshToken", void 0);
let ConfigController = class ConfigController {
    amazonAuth;
    config;
    constructor(amazonAuth, config) {
        this.amazonAuth = amazonAuth;
        this.config = config;
    }
    async getStatus() {
        const authStatus = this.amazonAuth.getConfigStatus();
        return {
            system: {
                status: authStatus.configured ? 'configured' : 'not_configured',
                environment: this.config.get('nodeEnv'),
            },
            amazon: {
                configured: authStatus.configured,
                advertisingAccountId: authStatus.advertisingAccountId,
                marketplace: authStatus.marketplace,
                sellerId: authStatus.sellerId,
                hasValidToken: authStatus.hasValidToken,
                tokenExpiresAt: authStatus.tokenExpiresAt,
            },
            budget: {
                monthlyMin: this.config.get('budget.monthlyMin'),
                monthlyMax: this.config.get('budget.monthlyMax'),
            },
            acos: {
                targetMin: this.config.get('acos.targetMin'),
                targetMax: this.config.get('acos.targetMax'),
                pauseMin: this.config.get('acos.pauseMin'),
                pauseMax: this.config.get('acos.pauseMax'),
            },
        };
    }
    async setCredentials(credentials) {
        return {
            message: 'Please update credentials in the .env file and restart the service',
            instructions: [
                '1. Open /home/ubuntu/amazon_ads_optimizer/nodejs_space/.env',
                '2. Update AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, and AMAZON_REFRESH_TOKEN',
                '3. Restart the service: yarn start:dev',
            ],
            currentStatus: this.amazonAuth.isConfigured() ? 'configured' : 'not_configured',
        };
    }
};
exports.ConfigController = ConfigController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get system configuration status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns system configuration status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('credentials'),
    (0, swagger_1.ApiOperation)({
        summary: 'Configure Amazon API credentials',
        description: 'Note: This endpoint currently requires manual .env file update. Use this to test credential validation.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Credentials validation result' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid credentials' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CredentialsDto]),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "setCredentials", null);
exports.ConfigController = ConfigController = __decorate([
    (0, swagger_1.ApiTags)('config'),
    (0, common_1.Controller)('api/config'),
    __metadata("design:paramtypes", [amazon_auth_service_1.AmazonAuthService,
        config_1.ConfigService])
], ConfigController);
//# sourceMappingURL=config.controller.js.map