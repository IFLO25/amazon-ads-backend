"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationModule = void 0;
const common_1 = require("@nestjs/common");
const optimization_service_1 = require("./optimization.service");
const optimization_controller_1 = require("./optimization.controller");
const campaigns_module_1 = require("../campaigns/campaigns.module");
const budget_module_1 = require("../budget/budget.module");
const keywords_module_1 = require("../keywords/keywords.module");
let OptimizationModule = class OptimizationModule {
};
exports.OptimizationModule = OptimizationModule;
exports.OptimizationModule = OptimizationModule = __decorate([
    (0, common_1.Module)({
        imports: [campaigns_module_1.CampaignsModule, budget_module_1.BudgetModule, keywords_module_1.KeywordsModule],
        controllers: [optimization_controller_1.OptimizationController],
        providers: [optimization_service_1.OptimizationService],
        exports: [optimization_service_1.OptimizationService],
    })
], OptimizationModule);
//# sourceMappingURL=optimization.module.js.map