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
exports.BudgetController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const budget_service_1 = require("./budget.service");
let BudgetController = class BudgetController {
    budgetService;
    constructor(budgetService) {
        this.budgetService = budgetService;
    }
    async getCurrentBudget() {
        return this.budgetService.getCurrentMonthBudget();
    }
    async getBudgetHistory(months) {
        const monthsNumber = months ? parseInt(months, 10) : 6;
        return this.budgetService.getBudgetHistory(monthsNumber);
    }
    async canSpendMore() {
        const canSpend = await this.budgetService.canSpendMore();
        const recommended = await this.budgetService.getRecommendedDailyBudget();
        return {
            canSpend,
            recommendedDailyBudget: recommended,
        };
    }
};
exports.BudgetController = BudgetController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current month budget status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns budget status for current month' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BudgetController.prototype, "getCurrentBudget", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get budget history' }),
    (0, swagger_1.ApiQuery)({ name: 'months', required: false, description: 'Number of months to fetch (default: 6)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns budget history' }),
    __param(0, (0, common_1.Query)('months')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BudgetController.prototype, "getBudgetHistory", null);
__decorate([
    (0, common_1.Get)('can-spend'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if budget allows more spending' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns whether more spending is allowed' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BudgetController.prototype, "canSpendMore", null);
exports.BudgetController = BudgetController = __decorate([
    (0, swagger_1.ApiTags)('budget'),
    (0, common_1.Controller)('api/budget'),
    __metadata("design:paramtypes", [budget_service_1.BudgetService])
], BudgetController);
//# sourceMappingURL=budget.controller.js.map