"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonAuthModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const amazon_auth_service_1 = require("./amazon-auth.service");
const amazon_api_client_1 = require("./amazon-api.client");
const amazon_auth_controller_1 = require("./amazon-auth.controller");
let AmazonAuthModule = class AmazonAuthModule {
};
exports.AmazonAuthModule = AmazonAuthModule;
exports.AmazonAuthModule = AmazonAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        controllers: [amazon_auth_controller_1.AmazonAuthController],
        providers: [amazon_auth_service_1.AmazonAuthService, amazon_api_client_1.AmazonApiClient],
        exports: [amazon_auth_service_1.AmazonAuthService, amazon_api_client_1.AmazonApiClient],
    })
], AmazonAuthModule);
//# sourceMappingURL=amazon-auth.module.js.map