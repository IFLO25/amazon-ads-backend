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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const campaigns_service_1 = require("./campaigns.service");
let CampaignsController = class CampaignsController {
    campaignsService;
    constructor(campaignsService) {
        this.campaignsService = campaignsService;
    }
    async findAll() {
        return this.campaignsService.findAll();
    }
    async findOne(id) {
        return this.campaignsService.findOne(id);
    }
    async getPerformance(id, days) {
        const daysNumber = days ? parseInt(days, 10) : 30;
        return this.campaignsService.getPerformanceMetrics(id, daysNumber);
    }
    async syncCampaigns() {
        await this.campaignsService.syncCampaignsFromAmazon();
        return { message: 'Campaigns synced successfully', timestamp: new Date() };
    }
    async syncMetrics() {
        await this.campaignsService.syncPerformanceMetrics();
        return { message: 'Performance metrics synced successfully', timestamp: new Date() };
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all campaigns' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all campaigns from database' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single campaign by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Campaign UUID from database' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns campaign details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Campaign not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get performance metrics for a campaign' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Campaign UUID from database' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, description: 'Number of days to fetch (default: 30)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns aggregated performance metrics' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Campaign not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "getPerformance", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync campaigns from Amazon Advertising API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Campaigns synced successfully' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Failed to sync campaigns' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "syncCampaigns", null);
__decorate([
    (0, common_1.Post)('sync-metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync performance metrics from Amazon' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Metrics synced successfully' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Failed to sync metrics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "syncMetrics", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, swagger_1.ApiTags)('campaigns'),
    (0, common_1.Controller)('api/campaigns'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map