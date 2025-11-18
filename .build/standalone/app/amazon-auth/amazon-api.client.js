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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AmazonApiClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonApiClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const amazon_auth_service_1 = require("./amazon-auth.service");
const axios_1 = __importDefault(require("axios"));
let AmazonApiClient = AmazonApiClient_1 = class AmazonApiClient {
    configService;
    authService;
    logger = new common_1.Logger(AmazonApiClient_1.name);
    axiosInstance;
    rateLimitDelay = 1000;
    lastRequestTime = 0;
    requestCount = 0;
    maxRequestsPerMinute = 60;
    constructor(configService, authService) {
        this.configService = configService;
        this.authService = authService;
        const apiEndpoint = this.configService.get('amazon.apiEndpoint');
        this.axiosInstance = axios_1.default.create({
            baseURL: apiEndpoint,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Amazon-Advertising-API-ClientId': this.configService.get('amazon.clientId'),
            },
        });
        this.axiosInstance.interceptors.request.use(async (config) => {
            await this.enforceRateLimit();
            const accessToken = await this.authService.getAccessToken();
            config.headers.Authorization = `Bearer ${accessToken}`;
            const accountId = this.configService.get('amazon.advertisingAccountId');
            config.headers['Amazon-Advertising-API-Scope'] = accountId;
            this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            this.logger.error('Request interceptor error', error);
            return Promise.reject(error);
        });
        this.axiosInstance.interceptors.response.use((response) => {
            this.logger.debug(`API Response: ${response.status} ${response.config.url}`);
            return response;
        }, async (error) => {
            const status = error.response?.status;
            const url = error.config?.url;
            if (status === 401) {
                this.logger.error('Unauthorized - token may be invalid', url);
            }
            else if (status === 429) {
                this.logger.warn('Rate limit exceeded, waiting 60 seconds...', url);
                await this.sleep(60000);
                return this.axiosInstance.request(error.config);
            }
            else if (status >= 500) {
                this.logger.error(`Server error (${status})`, url, error.response?.data);
            }
            return Promise.reject(error);
        });
    }
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest > 60000) {
            this.requestCount = 0;
        }
        if (this.requestCount >= this.maxRequestsPerMinute) {
            const waitTime = 60000 - timeSinceLastRequest;
            this.logger.warn(`Rate limit approaching, waiting ${waitTime}ms`);
            await this.sleep(waitTime);
            this.requestCount = 0;
        }
        if (timeSinceLastRequest < this.rateLimitDelay) {
            await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async get(url, config) {
        const response = await this.axiosInstance.get(url, config);
        return response.data;
    }
    async post(url, data, config) {
        const response = await this.axiosInstance.post(url, data, config);
        return response.data;
    }
    async put(url, data, config) {
        const response = await this.axiosInstance.put(url, data, config);
        return response.data;
    }
    async delete(url, config) {
        const response = await this.axiosInstance.delete(url, config);
        return response.data;
    }
    async getCampaigns(stateFilter) {
        let url = '/sp/campaigns';
        if (stateFilter) {
            url += `?stateFilter=${stateFilter}`;
        }
        return this.get(url);
    }
};
exports.AmazonApiClient = AmazonApiClient;
exports.AmazonApiClient = AmazonApiClient = AmazonApiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        amazon_auth_service_1.AmazonAuthService])
], AmazonApiClient);
//# sourceMappingURL=amazon-api.client.js.map