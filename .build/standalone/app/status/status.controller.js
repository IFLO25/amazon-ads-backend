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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../prisma/prisma.service");
const amazon_auth_service_1 = require("../amazon-auth/amazon-auth.service");
let StatusController = class StatusController {
    prisma;
    amazonAuth;
    constructor(prisma, amazonAuth) {
        this.prisma = prisma;
        this.amazonAuth = amazonAuth;
    }
    async getStatus() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const dbStatus = 'connected';
            const amazonConfigured = this.amazonAuth.isConfigured();
            const totalCampaigns = await this.prisma.campaign.count();
            const enabledCampaigns = await this.prisma.campaign.count({
                where: { status: 'ENABLED' },
            });
            const pausedCampaigns = await this.prisma.campaign.count({
                where: { status: 'PAUSED' },
            });
            const lastOptimization = await this.prisma.optimization_history.findFirst({
                orderBy: { timestamp: 'desc' },
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMetrics = await this.prisma.performance_metric.findMany({
                where: { date: { gte: today } },
            });
            const todaySpend = todayMetrics.reduce((sum, m) => sum + m.spend, 0);
            const todaySales = todayMetrics.reduce((sum, m) => sum + m.sales, 0);
            return {
                status: 'healthy',
                timestamp: new Date(),
                services: {
                    database: {
                        status: dbStatus,
                        connected: true,
                    },
                    amazonApi: {
                        status: amazonConfigured ? 'configured' : 'not_configured',
                        configured: amazonConfigured,
                    },
                },
                campaigns: {
                    total: totalCampaigns,
                    enabled: enabledCampaigns,
                    paused: pausedCampaigns,
                    archived: totalCampaigns - enabledCampaigns - pausedCampaigns,
                },
                optimization: {
                    lastRun: lastOptimization?.timestamp || null,
                    totalActions: await this.prisma.optimization_history.count(),
                },
                performance: {
                    today: {
                        spend: todaySpend,
                        sales: todaySales,
                        acos: todaySales > 0 ? (todaySpend / todaySales) * 100 : 0,
                    },
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                error: error.message,
            };
        }
    }
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date(),
        };
    }
};
exports.StatusController = StatusController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get overall system status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns system health status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatusController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Simple health check endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is healthy' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatusController.prototype, "healthCheck", null);
exports.StatusController = StatusController = __decorate([
    (0, swagger_1.ApiTags)('status'),
    (0, common_1.Controller)('api/status'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        amazon_auth_service_1.AmazonAuthService])
], StatusController);
//# sourceMappingURL=status.controller.js.map