"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("@nestjs/axios");
const configuration_1 = __importDefault(require("./config/configuration"));
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const amazon_auth_module_1 = require("./amazon-auth/amazon-auth.module");
const campaigns_module_1 = require("./campaigns/campaigns.module");
const optimization_module_1 = require("./optimization/optimization.module");
const budget_module_1 = require("./budget/budget.module");
const keywords_module_1 = require("./keywords/keywords.module");
const config_controller_1 = require("./config/config.controller");
const status_controller_1 = require("./status/status.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            schedule_1.ScheduleModule.forRoot(),
            axios_1.HttpModule,
            prisma_module_1.PrismaModule,
            amazon_auth_module_1.AmazonAuthModule,
            campaigns_module_1.CampaignsModule,
            optimization_module_1.OptimizationModule,
            budget_module_1.BudgetModule,
            keywords_module_1.KeywordsModule,
        ],
        controllers: [app_controller_1.AppController, config_controller_1.ConfigController, status_controller_1.StatusController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map