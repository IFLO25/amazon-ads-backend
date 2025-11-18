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
exports.KeywordsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const keywords_service_1 = require("./keywords.service");
let KeywordsController = class KeywordsController {
    keywordsService;
    constructor(keywordsService) {
        this.keywordsService = keywordsService;
    }
    async optimizeKeywords() {
        return this.keywordsService.optimizeAllKeywords();
    }
    async getHistory(days) {
        const numDays = days ? parseInt(days, 10) : 30;
        return this.keywordsService.getOptimizationHistory(numDays);
    }
};
exports.KeywordsController = KeywordsController;
__decorate([
    (0, common_1.Post)('optimize'),
    (0, swagger_1.ApiOperation)({
        summary: '🎯 Vollautomatische Keyword-Optimierung',
        description: 'Führt eine vollständige Keyword-Optimierung durch:\n' +
            '- Fügt negative Keywords hinzu (schlechte Performance)\n' +
            '- Erstellt positive Keywords (gute Performance)\n' +
            '- Pausiert schlecht performende Keywords\n' +
            '- Passt Gebote automatisch an',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Optimierung erfolgreich durchgeführt',
        schema: {
            example: {
                negativeKeywordsAdded: 15,
                positiveKeywordsAdded: 8,
                keywordsPaused: 5,
                bidsAdjusted: 23,
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KeywordsController.prototype, "optimizeKeywords", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: '📊 Optimierungs-Historie abrufen',
        description: 'Zeigt alle Keyword-Optimierungen der letzten X Tage',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'days',
        required: false,
        type: Number,
        description: 'Anzahl Tage (Standard: 30)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Optimierungs-Historie erfolgreich abgerufen',
    }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeywordsController.prototype, "getHistory", null);
exports.KeywordsController = KeywordsController = __decorate([
    (0, swagger_1.ApiTags)('Keywords'),
    (0, common_1.Controller)('keywords'),
    __metadata("design:paramtypes", [keywords_service_1.KeywordsService])
], KeywordsController);
//# sourceMappingURL=keywords.controller.js.map