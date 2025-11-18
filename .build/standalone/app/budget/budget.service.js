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
var BudgetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let BudgetService = BudgetService_1 = class BudgetService {
    prisma;
    configService;
    logger = new common_1.Logger(BudgetService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async handleDailyBudgetUpdate() {
        this.logger.log('Running daily budget update...');
        await this.updateBudgetTracking();
    }
    async getCurrentMonthBudget() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let budgetTracking = await this.prisma.budget_tracking.findUnique({
            where: { month: monthStart },
        });
        if (!budgetTracking) {
            const totalBudget = this.configService.get('budget.monthlyMax') || 2000;
            budgetTracking = await this.prisma.budget_tracking.create({
                data: {
                    month: monthStart,
                    total_budget: totalBudget,
                    spent: 0,
                    remaining: totalBudget,
                },
            });
        }
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const actualSpent = await this.calculateSpentInPeriod(monthStart, monthEnd);
        if (Math.abs(actualSpent - budgetTracking.spent) > 0.01) {
            budgetTracking = await this.prisma.budget_tracking.update({
                where: { month: monthStart },
                data: {
                    spent: actualSpent,
                    remaining: budgetTracking.total_budget - actualSpent,
                },
            });
        }
        const daysInMonth = monthEnd.getDate();
        const daysElapsed = now.getDate();
        const daysRemaining = daysInMonth - daysElapsed;
        return {
            month: monthStart.toISOString().slice(0, 7),
            totalBudget: budgetTracking.total_budget,
            spent: budgetTracking.spent,
            remaining: budgetTracking.remaining,
            percentUsed: (budgetTracking.spent / budgetTracking.total_budget) * 100,
            averageDailySpend: daysElapsed > 0 ? budgetTracking.spent / daysElapsed : 0,
            projectedMonthlySpend: daysElapsed > 0 ? (budgetTracking.spent / daysElapsed) * daysInMonth : 0,
            daysElapsed,
            daysRemaining,
            budgetPerRemainingDay: daysRemaining > 0 ? budgetTracking.remaining / daysRemaining : 0,
        };
    }
    async getBudgetHistory(months = 6) {
        const history = await this.prisma.budget_tracking.findMany({
            orderBy: { month: 'desc' },
            take: months,
        });
        return history.map((entry) => ({
            month: entry.month.toISOString().slice(0, 7),
            totalBudget: entry.total_budget,
            spent: entry.spent,
            remaining: entry.remaining,
            percentUsed: (entry.spent / entry.total_budget) * 100,
            underBudget: entry.remaining > 0,
        }));
    }
    async updateBudgetTracking() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const totalSpent = await this.calculateSpentInPeriod(monthStart, monthEnd);
        let budgetTracking = await this.prisma.budget_tracking.findUnique({
            where: { month: monthStart },
        });
        if (!budgetTracking) {
            const totalBudget = this.configService.get('budget.monthlyMax') || 2000;
            budgetTracking = await this.prisma.budget_tracking.create({
                data: {
                    month: monthStart,
                    total_budget: totalBudget,
                    spent: totalSpent,
                    remaining: totalBudget - totalSpent,
                },
            });
            this.logger.log(`Created budget tracking for ${monthStart.toISOString().slice(0, 7)}`);
        }
        else {
            await this.prisma.budget_tracking.update({
                where: { month: monthStart },
                data: {
                    spent: totalSpent,
                    remaining: budgetTracking.total_budget - totalSpent,
                },
            });
            this.logger.log(`Updated budget tracking: ${totalSpent.toFixed(2)}€ / ${budgetTracking.total_budget}€`);
        }
        if (totalSpent >= budgetTracking.total_budget) {
            this.logger.warn('⚠️  Monthly budget exceeded!');
        }
    }
    async calculateSpentInPeriod(startDate, endDate) {
        const metrics = await this.prisma.performance_metric.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        return metrics.reduce((sum, metric) => sum + metric.spend, 0);
    }
    async canSpendMore() {
        const budgetStatus = await this.getCurrentMonthBudget();
        return budgetStatus.remaining > 0;
    }
    async getRecommendedDailyBudget() {
        const budgetStatus = await this.getCurrentMonthBudget();
        if (budgetStatus.daysRemaining <= 0) {
            return 0;
        }
        return budgetStatus.budgetPerRemainingDay;
    }
};
exports.BudgetService = BudgetService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BudgetService.prototype, "handleDailyBudgetUpdate", null);
exports.BudgetService = BudgetService = BudgetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BudgetService);
//# sourceMappingURL=budget.service.js.map