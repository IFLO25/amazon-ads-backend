"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonAuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const amazon_auth_service_1 = require("./amazon-auth.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AmazonAuthController = class AmazonAuthController {
    amazonAuthService;
    constructor(amazonAuthService) {
        this.amazonAuthService = amazonAuthService;
    }
    async exchangeCodeForToken(body) {
        try {
            const { code, clientId, clientSecret, redirectUri } = body;
            const tokenData = await this.amazonAuthService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
            if (!tokenData.refresh_token) {
                throw new common_1.HttpException('No refresh token received', common_1.HttpStatus.BAD_REQUEST);
            }
            const envPath = path.join(__dirname, '../../.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/AMAZON_REFRESH_TOKEN=.*/, `AMAZON_REFRESH_TOKEN=${tokenData.refresh_token}`);
            fs.writeFileSync(envPath, envContent);
            return {
                success: true,
                message: 'Refresh token saved successfully',
                refreshToken: tokenData.refresh_token,
                accessToken: tokenData.access_token,
                expiresIn: tokenData.expires_in
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: error.message || 'Failed to exchange code for token',
                error: error.response?.data || error.message
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.AmazonAuthController = AmazonAuthController;
__decorate([
    (0, common_1.Post)('exchange-code'),
    (0, swagger_1.ApiOperation)({
        summary: 'Exchange authorization code for refresh token',
        description: 'Converts an Amazon OAuth authorization code into a refresh token and saves it to .env'
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Authorization code from Amazon OAuth' },
                clientId: { type: 'string', description: 'Amazon Client ID' },
                clientSecret: { type: 'string', description: 'Amazon Client Secret' },
                redirectUri: { type: 'string', description: 'Redirect URI used in OAuth flow' }
            },
            required: ['code', 'clientId', 'clientSecret', 'redirectUri']
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AmazonAuthController.prototype, "exchangeCodeForToken", null);
exports.AmazonAuthController = AmazonAuthController = __decorate([
    (0, swagger_1.ApiTags)('Amazon Auth'),
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [amazon_auth_service_1.AmazonAuthService])
], AmazonAuthController);
//# sourceMappingURL=amazon-auth.controller.js.map