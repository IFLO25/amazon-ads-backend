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
exports.OptimizationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const optimization_service_1 = require("./optimization.service");
let OptimizationController = class OptimizationController {
    optimizationService;
    constructor(optimizationService) {
        this.optimizationService = optimizationService;
    }
    async optimize() {
        const actions = await this.optimizationService.optimizeAllCampaigns();
        return {
            message: 'Optimization completed',
            actionsCount: actions.length,
            actions,
            timestamp: new Date(),
        };
    }
    async getHistory(limit) {
        const limitNumber = limit ? parseInt(limit, 10) : 100;
        return this.optimizationService.getOptimizationHistory(limitNumber);
    }
};
exports.OptimizationController = OptimizationController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger manual optimization of all campaigns' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Optimization completed successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OptimizationController.prototype, "optimize", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get optimization history' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Number of records to fetch (default: 100)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns optimization history' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OptimizationController.prototype, "getHistory", null);
exports.OptimizationController = OptimizationController = __decorate([
    (0, swagger_1.ApiTags)('optimization'),
    (0, common_1.Controller)('api/optimize'),
    __metadata("design:paramtypes", [optimization_service_1.OptimizationService])
], OptimizationController);
//# sourceMappingURL=optimization.controller.js.map