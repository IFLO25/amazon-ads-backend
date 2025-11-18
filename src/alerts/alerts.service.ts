
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface AlertEvent {
  type: 'BUDGET_WARNING' | 'BUDGET_EXCEEDED' | 'CAMPAIGN_POOR_PERFORMANCE' | 'HIGH_COST_SPIKE' | 'ACOS_THRESHOLD';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  campaignId?: string;
  campaignName?: string;
  data?: any;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // E-Mail-Konfiguration
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');
    const emailHost = this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com');
    const emailPort = parseInt(this.configService.get<string>('EMAIL_PORT', '587'), 10);

    if (emailUser && emailPassword) {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      this.logger.log('E-Mail-Service initialisiert');
    } else {
      this.logger.warn('E-Mail-Credentials fehlen - Alerts werden nur geloggt');
    }
  }

  /**
   * Hauptmethode: Alert senden
   */
  async sendAlert(event: AlertEvent): Promise<void> {
    this.logger.warn(`🚨 ALERT [${event.severity}]: ${event.title}`);
    this.logger.log(event.message);

    // Alert in DB speichern
    await this.saveAlertToDatabase(event);

    // E-Mail senden wenn konfiguriert
    if (this.transporter) {
      await this.sendEmailAlert(event);
    }
  }

  /**
   * Prüfe Budget-Status und sende Alerts
   */
  async checkBudgetAlerts(): Promise<void> {
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'ENABLED',
        },
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const campaign of campaigns) {
        // Tägliche Ausgaben berechnen
        const dailySpend = await this.calculateDailySpend(campaign.campaignId, today);
        const dailyBudget = campaign.budget || 50; // Default 50€

        // Warnung bei 80% des Budgets
        if (dailySpend >= dailyBudget * 0.8 && dailySpend < dailyBudget) {
          await this.sendAlert({
            type: 'BUDGET_WARNING',
            severity: 'WARNING',
            title: '⚠️ Budget-Warnung',
            message: `Kampagne "${campaign.name}" hat 80% des Tagesbudgets erreicht (${dailySpend.toFixed(2)}€ von ${dailyBudget}€)`,
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            data: { dailySpend, dailyBudget, percentage: 80 },
          });
        }

        // Kritisch bei Budget-Überschreitung
        if (dailySpend >= dailyBudget) {
          await this.sendAlert({
            type: 'BUDGET_EXCEEDED',
            severity: 'CRITICAL',
            title: '🚨 Budget überschritten!',
            message: `Kampagne "${campaign.name}" hat das Tagesbudget überschritten! (${dailySpend.toFixed(2)}€ von ${dailyBudget}€)`,
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            data: { dailySpend, dailyBudget },
          });
        }
      }
    } catch (error) {
      this.logger.error('Fehler beim Budget-Check:', error);
    }
  }

  /**
   * Prüfe Kampagnen-Performance und sende Alerts
   */
  async checkPerformanceAlerts(): Promise<void> {
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'ENABLED',
        },
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const campaign of campaigns) {
        const metrics = await this.calculateCampaignMetrics(campaign.campaignId, sevenDaysAgo);

        // Alert bei sehr schlechter Performance
        if (metrics.acos > 50 && metrics.spend > 50) {
          await this.sendAlert({
            type: 'CAMPAIGN_POOR_PERFORMANCE',
            severity: 'WARNING',
            title: '📉 Schlechte Kampagnen-Performance',
            message: `Kampagne "${campaign.name}" hat einen ACoS von ${metrics.acos.toFixed(1)}% bei ${metrics.spend.toFixed(2)}€ Ausgaben in den letzten 7 Tagen`,
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            data: metrics,
          });
        }

        // Alert bei Kosten-Spike (50% mehr als üblich)
        const avgDailySpend = await this.getAverageDailySpend(campaign.campaignId);
        const todaySpend = await this.calculateDailySpend(campaign.campaignId, new Date());
        
        if (todaySpend > avgDailySpend * 1.5 && avgDailySpend > 10) {
          await this.sendAlert({
            type: 'HIGH_COST_SPIKE',
            severity: 'WARNING',
            title: '⚡ Ungewöhnlich hohe Ausgaben',
            message: `Kampagne "${campaign.name}" hat heute ${todaySpend.toFixed(2)}€ ausgegeben (Durchschnitt: ${avgDailySpend.toFixed(2)}€)`,
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            data: { todaySpend, avgDailySpend, increase: ((todaySpend / avgDailySpend - 1) * 100).toFixed(1) + '%' },
          });
        }
      }
    } catch (error) {
      this.logger.error('Fehler beim Performance-Check:', error);
    }
  }

  /**
   * E-Mail senden
   */
  private async sendEmailAlert(event: AlertEvent): Promise<void> {
    try {
      const recipientEmail = this.configService.get<string>('ALERT_EMAIL');
      if (!recipientEmail) {
        this.logger.warn('Keine Alert-E-Mail-Adresse konfiguriert');
        return;
      }

      const severityEmoji = {
        INFO: 'ℹ️',
        WARNING: '⚠️',
        CRITICAL: '🚨',
      };

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${event.severity === 'CRITICAL' ? '#d32f2f' : '#f57c00'};">
            ${severityEmoji[event.severity]} ${event.title}
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            ${event.message}
          </p>
          ${event.data ? `
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3>Details:</h3>
              <pre style="font-size: 14px;">${JSON.stringify(event.data, null, 2)}</pre>
            </div>
          ` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            Amazon Ads Optimizer - Automatische Benachrichtigung<br>
            Zeitstempel: ${new Date().toLocaleString('de-DE')}
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_USER'),
        to: recipientEmail,
        subject: `[${event.severity}] ${event.title}`,
        html: htmlBody,
      });

      this.logger.log(`✅ Alert-E-Mail gesendet an ${recipientEmail}`);
    } catch (error) {
      this.logger.error('Fehler beim E-Mail-Versand:', error);
    }
  }

  /**
   * Alert in Datenbank speichern
   */
  private async saveAlertToDatabase(event: AlertEvent): Promise<void> {
    try {
      await this.prisma.alert.create({
        data: {
          type: event.type,
          severity: event.severity,
          title: event.title,
          message: event.message,
          campaignId: event.campaignId,
          data: event.data ? JSON.stringify(event.data) : null,
        },
      });
    } catch (error) {
      this.logger.error('Fehler beim Speichern des Alerts:', error);
    }
  }

  // Helper-Methoden
  private async calculateDailySpend(campaignId: string, date: Date): Promise<number> {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: date,
          lt: nextDay,
        },
      },
    });

    return keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
  }

  private async calculateCampaignMetrics(campaignId: string, since: Date) {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: since,
        },
      },
    });

    const spend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    const sales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
    const acos = sales > 0 ? (spend / sales) * 100 : 0;

    return { spend, sales, acos };
  }

  private async getAverageDailySpend(campaignId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keywords = await this.prisma.keyword.findMany({
      where: {
        campaignId,
        lastUpdated: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalSpend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    return totalSpend / 30;
  }
}
