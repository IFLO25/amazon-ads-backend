
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OptimizationService } from './optimization.service';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BudgetService } from '../budget/budget.service';

describe('OptimizationService', () => {
  let service: OptimizationService;
  let prismaService: PrismaService;
  let campaignsService: CampaignsService;
  let budgetService: BudgetService;
  let configService: ConfigService;

  const mockPrismaService = {
    campaign: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    performance_metric: {
      findMany: jest.fn(),
    },
    optimizationHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCampaignsService = {
    updateCampaign: jest.fn(),
    syncCampaignsFromAmazon: jest.fn(),
    syncPerformanceMetrics: jest.fn(),
  };

  const mockBudgetService = {
    getCurrentMonthBudget: jest.fn().mockResolvedValue({
      remaining: 1000,
      spent: 500,
      totalBudget: 1500,
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'acos.targetMin': 5,
        'acos.targetMax': 15,
        'acos.pauseMin': 40,
        'acos.pauseMax': 60,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampaignsService, useValue: mockCampaignsService },
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OptimizationService>(OptimizationService);
    prismaService = module.get<PrismaService>(PrismaService);
    campaignsService = module.get<CampaignsService>(CampaignsService);
    budgetService = module.get<BudgetService>(BudgetService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeAllCampaigns', () => {
    it('should skip optimization if budget is exhausted', async () => {
      mockBudgetService.getCurrentMonthBudget.mockResolvedValueOnce({
        remaining: 0,
        spent: 2000,
        totalBudget: 2000,
      });

      const result = await service.optimizeAllCampaigns();

      expect(result).toEqual([]);
      expect(prismaService.campaign.findMany).not.toHaveBeenCalled();
    });

    it('should process campaigns when budget is available', async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([
        {
          id: 'test-1',
          campaignId: 'camp-1',
          name: 'Test Campaign',
          status: 'ENABLED',
          budget: 50,
          currentAcos: null, // No data yet
          targetAcos: 15,
        },
      ]);

      const result = await service.optimizeAllCampaigns();

      expect(result).toEqual([]);
      expect(prismaService.campaign.findMany).toHaveBeenCalled();
    });
  });

  describe('getOptimizationHistory', () => {
    it('should return optimization history with default limit', async () => {
      const mockHistory = [
        {
          id: '1',
          campaignId: 'camp-1',
          timestamp: new Date(),
          action: 'BUDGET_INCREASE',
          oldValue: '50',
          newValue: '55',
          reason: 'Good performance',
          campaign: {
            name: 'Test Campaign',
            campaignId: 'camp-1',
          },
        },
      ];

      mockPrismaService.optimizationHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getOptimizationHistory();

      expect(result).toEqual(mockHistory);
      expect(prismaService.optimizationHistory.findMany).toHaveBeenCalledWith({
        include: {
          campaign: {
            select: {
              name: true,
              campaignId: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should return optimization history with custom limit', async () => {
      mockPrismaService.optimizationHistory.findMany.mockResolvedValue([]);

      await service.getOptimizationHistory(50);

      expect(prismaService.optimizationHistory.findMany).toHaveBeenCalledWith({
        include: {
          campaign: {
            select: {
              name: true,
              campaignId: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });
  });
});
