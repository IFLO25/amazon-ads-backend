
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AmazonApiClient } from '../amazon-auth/amazon-api.client';

interface AmazonCampaign {
  campaignId: string;
  name: string;
  state: string;
  budget: {
    budget: number;
    budgetType: string;
  };
  startDate: string;
  endDate?: string;
  targetingType: string;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private campaignsCache: AmazonCampaign[] = []; // In-memory cache since no database
  private lastSync: Date | null = null;

  constructor(
    private readonly amazonApi: AmazonApiClient,
  ) {}

  /**
   * Sync campaigns from Amazon Advertising API
   */
  async syncCampaignsFromAmazon(): Promise<void> {
    try {
      this.logger.log('🔄 Starting campaign sync from Amazon...');

      // Fetch campaigns from Amazon API
      const campaigns = await this.amazonApi.get<AmazonCampaign[]>('/sp/campaigns');

      this.logger.log(`✅ Fetched ${campaigns.length} campaigns from Amazon`);

      // Store in memory
      this.campaignsCache = campaigns;
      this.lastSync = new Date();

      this.logger.log(`✅ Campaign sync completed! Last sync: ${this.lastSync.toISOString()}`);
    } catch (error) {
      this.logger.error('❌ Failed to sync campaigns from Amazon', error);
      throw error;
    }
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns() {
    try {
      // Auto-sync if cache is empty or stale (>5 minutes)
      if (
        this.campaignsCache.length === 0 ||
        !this.lastSync ||
        Date.now() - this.lastSync.getTime() > 5 * 60 * 1000
      ) {
        this.logger.log('📦 Cache empty or stale, syncing from Amazon...');
        await this.syncCampaignsFromAmazon();
      }

      this.logger.log(`📊 Returning ${this.campaignsCache.length} campaigns from cache`);
      return this.campaignsCache.map(campaign => ({
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.state,
        budget: campaign.budget?.budget || 0,
        budgetType: campaign.budget?.budgetType || 'DAILY',
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        targetingType: campaign.targetingType,
      }));
    } catch (error) {
      this.logger.error('❌ Failed to get campaigns', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string) {
    try {
      // Ensure cache is populated
      if (this.campaignsCache.length === 0) {
        await this.syncCampaignsFromAmazon();
      }

      const campaign = this.campaignsCache.find(c => c.campaignId === campaignId);
      
      if (!campaign) {
        throw new NotFoundException(`Campaign ${campaignId} not found`);
      }

      return {
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.state,
        budget: campaign.budget?.budget || 0,
        budgetType: campaign.budget?.budgetType || 'DAILY',
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        targetingType: campaign.targetingType,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get campaign ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * Get campaigns summary statistics
   */
  async getCampaignsSummary() {
    try {
      // Ensure cache is populated
      if (this.campaignsCache.length === 0) {
        await this.syncCampaignsFromAmazon();
      }

      const total = this.campaignsCache.length;
      const enabled = this.campaignsCache.filter(c => c.state === 'ENABLED').length;
      const paused = this.campaignsCache.filter(c => c.state === 'PAUSED').length;
      const archived = this.campaignsCache.filter(c => c.state === 'ARCHIVED').length;

      return {
        total,
        enabled,
        paused,
        archived,
        lastSync: this.lastSync,
      };
    } catch (error) {
      this.logger.error('❌ Failed to get campaigns summary', error);
      throw error;
    }
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(campaignId: string, newBudget: number) {
    try {
      this.logger.log(`🔧 Updating budget for campaign ${campaignId} to ${newBudget}`);

      // Update via Amazon API
      await this.amazonApi.put(`/sp/campaigns/${campaignId}`, {
        budget: {
          budget: newBudget,
          budgetType: 'DAILY',
        },
      });

      // Refresh cache
      await this.syncCampaignsFromAmazon();

      this.logger.log(`✅ Budget updated successfully for campaign ${campaignId}`);
      return { success: true, campaignId, newBudget };
    } catch (error) {
      this.logger.error(`❌ Failed to update budget for campaign ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string) {
    try {
      this.logger.log(`⏸️ Pausing campaign ${campaignId}`);

      // Update via Amazon API
      await this.amazonApi.put(`/sp/campaigns/${campaignId}`, {
        state: 'PAUSED',
      });

      // Refresh cache
      await this.syncCampaignsFromAmazon();

      this.logger.log(`✅ Campaign ${campaignId} paused successfully`);
      return { success: true, campaignId, status: 'PAUSED' };
    } catch (error) {
      this.logger.error(`❌ Failed to pause campaign ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * Enable campaign
   */
  async enableCampaign(campaignId: string) {
    try {
      this.logger.log(`▶️ Enabling campaign ${campaignId}`);

      // Update via Amazon API
      await this.amazonApi.put(`/sp/campaigns/${campaignId}`, {
        state: 'ENABLED',
      });

      // Refresh cache
      await this.syncCampaignsFromAmazon();

      this.logger.log(`✅ Campaign ${campaignId} enabled successfully`);
      return { success: true, campaignId, status: 'ENABLED' };
    } catch (error) {
      this.logger.error(`❌ Failed to enable campaign ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * Sync performance metrics (stub for optimization service)
   */
  async syncPerformanceMetrics(): Promise<any> {
    this.logger.log('📊 Syncing performance metrics (in-memory only)');
    // Returns cached campaigns data
    return this.campaignsCache;
  }

  /**
   * Optimize targeting (stub for optimization service)
   */
  async optimizeTargeting(campaignId: string): Promise<any> {
    this.logger.log(`🎯 Optimizing targeting for campaign: ${campaignId} (stub)`);
    // Stub implementation - queues optimization
    return { success: true, message: 'Targeting optimization queued' };
  }

  /**
   * Update campaign (stub for optimization service)
   */
  async updateCampaign(campaignId: string, updates: any): Promise<any> {
    this.logger.log(`📝 Updating campaign: ${campaignId}`);
    try {
      // Update cache
      const campaign = this.campaignsCache.find(c => c.campaignId === campaignId);
      if (campaign) {
        Object.assign(campaign, updates);
      }
      
      return { success: true, campaign };
    } catch (error) {
      this.logger.error(`❌ Failed to update campaign ${campaignId}:`, error.message);
      throw error;
    }
  }
}
