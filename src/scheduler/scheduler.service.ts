
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from '../campaigns/campaigns.service';
import { KeywordsService } from '../keywords/keywords.service';
import { OptimizationService } from '../optimization/optimization.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly keywordsService: KeywordsService,
    private readonly optimizationService: OptimizationService,
  ) {}

  // 🔄 AUTOMATISCHE SYNCHRONISIERUNG ALLE 6 STUNDEN
  // Läuft um: 00:00, 06:00, 12:00, 18:00 Uhr
  @Cron('0 */6 * * *')
  async handleAutomaticSync() {
    this.logger.log('🔄 Starte automatische Synchronisierung...');
    
    try {
      // Synchronisiere Kampagnen
      this.logger.log('📊 Synchronisiere Kampagnen...');
      await this.campaignsService.syncCampaignsFromAmazon();
      
      // Synchronisiere Performance Metriken
      this.logger.log('📈 Synchronisiere Performance-Metriken...');
      await this.campaignsService.syncPerformanceMetrics();
      
      this.logger.log('✅ Automatische Synchronisierung erfolgreich abgeschlossen!');
    } catch (error) {
      this.logger.error('❌ Fehler bei automatischer Synchronisierung:', error.message);
    }
  }

  // ⚡ AUTOMATISCHE OPTIMIERUNG ALLE 6 STUNDEN
  // Läuft um: 03:00, 09:00, 15:00, 21:00 Uhr (3 Stunden nach Sync)
  @Cron('0 3,9,15,21 * * *')
  async handleAutomaticOptimization() {
    this.logger.log('⚡ Starte automatische Optimierung...');
    
    try {
      // Run campaign optimization
      const campaignActions = await this.optimizationService.optimizeAllCampaigns();
      
      // Run keyword optimization
      const keywordResults = await this.keywordsService.optimizeAllKeywords();
      
      this.logger.log(`✅ Automatische Optimierung erfolgreich!`);
      this.logger.log(`📊 Kampagnen-Aktionen: ${campaignActions.length}`);
      this.logger.log(`🔑 Keyword-Optimierungen: ${keywordResults.negativeKeywordsAdded + keywordResults.positiveKeywordsAdded + keywordResults.keywordsPaused + keywordResults.bidsAdjusted}`);
    } catch (error) {
      this.logger.error('❌ Fehler bei automatischer Optimierung:', error.message);
    }
  }

  // 📊 STATUS-LOG JEDE STUNDE (optional - zeigt, dass System läuft)
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyStatus() {
    this.logger.log('💚 System läuft - Nächste Sync/Optimierung geplant');
  }
}
