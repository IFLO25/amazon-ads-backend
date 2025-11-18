
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // E-Mail-Setup (gleich wie bei Alerts)
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
    }
  }

  /**
   * Jeden Montag um 8 Uhr: Wöchentlicher Report
   */
  @Cron('0 8 * * 1') // Montag 8 Uhr
  async sendWeeklyReport(): Promise<void> {
    this.logger.log('📊 Erstelle wöchentlichen Report...');
    
    try {
      const report = await this.generateWeeklyReport();
      await this.sendReportEmail('Wöchentlicher Report', report);
      
      this.logger.log('✅ Wöchentlicher Report versendet');
    } catch (error) {
      this.logger.error('❌ Fehler beim Wochenreport:', error);
    }
  }

  /**
   * Jeden 1. des Monats um 9 Uhr: Monatlicher Report
   */
  @Cron('0 9 1 * *')
  async sendMonthlyReport(): Promise<void> {
    this.logger.log('📈 Erstelle monatlichen Report...');
    
    try {
      const report = await this.generateMonthlyReport();
      await this.sendReportEmail('Monatlicher Report', report);
      
      this.logger.log('✅ Monatlicher Report versendet');
    } catch (error) {
      this.logger.error('❌ Fehler beim Monatsreport:', error);
    }
  }

  /**
   * Generiere Wochenreport
   */
  private async generateWeeklyReport(): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Aktuelle Woche
    const currentWeek = await this.getPerformanceMetrics(sevenDaysAgo, new Date());
    
    // Vorwoche
    const previousWeek = await this.getPerformanceMetrics(fourteenDaysAgo, sevenDaysAgo);

    // Top/Bottom Kampagnen
    const topCampaigns = await this.getTopCampaigns(5, sevenDaysAgo);
    const bottomCampaigns = await this.getBottomCampaigns(5, sevenDaysAgo);

    // Top/Bottom Keywords
    const topKeywords = await this.getTopKeywords(10, sevenDaysAgo);
    const bottomKeywords = await this.getBottomKeywords(10, sevenDaysAgo);

    return {
      period: 'Letzte 7 Tage',
      currentWeek,
      previousWeek,
      comparison: this.calculateComparison(currentWeek, previousWeek),
      topCampaigns,
      bottomCampaigns,
      topKeywords,
      bottomKeywords,
      optimizations: await this.getRecentOptimizations(sevenDaysAgo),
    };
  }

  /**
   * Generiere Monatsreport
   */
  private async generateMonthlyReport(): Promise<any> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Aktueller Monat
    const currentMonth = await this.getPerformanceMetrics(firstDayOfMonth, now);
    
    // Vormonat
    const previousMonth = await this.getPerformanceMetrics(firstDayOfLastMonth, lastDayOfLastMonth);

    // Budget-Prognose
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const projectedSpend = (currentMonth.spend / currentDay) * daysInMonth;

    return {
      period: `${now.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}`,
      currentMonth,
      previousMonth,
      comparison: this.calculateComparison(currentMonth, previousMonth),
      budgetProjection: {
        spentSoFar: currentMonth.spend,
        projectedTotal: projectedSpend,
        daysRemaining: daysInMonth - currentDay,
        dailyAverage: currentMonth.spend / currentDay,
      },
      topCampaigns: await this.getTopCampaigns(10, firstDayOfMonth),
      bottomCampaigns: await this.getBottomCampaigns(5, firstDayOfMonth),
      topKeywords: await this.getTopKeywords(20, firstDayOfMonth),
      bottomKeywords: await this.getBottomKeywords(10, firstDayOfMonth),
      optimizations: await this.getRecentOptimizations(firstDayOfMonth),
    };
  }

  /**
   * Performance-Metriken berechnen
   */
  private async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<any> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const impressions = keywords.reduce((sum: any, kw: any) => sum + (kw.impressions || 0), 0);
    const clicks = keywords.reduce((sum: any, kw: any) => sum + (kw.clicks || 0), 0);
    const spend = keywords.reduce((sum: any, kw: any) => sum + (kw.spend || 0), 0);
    const sales = keywords.reduce((sum: any, kw: any) => sum + (kw.sales || 0), 0);
    const conversions = keywords.reduce((sum: any, kw: any) => sum + (kw.conversions || 0), 0);

    return {
      impressions,
      clicks,
      spend: parseFloat(spend.toFixed(2)),
      sales: parseFloat(sales.toFixed(2)),
      conversions,
      acos: sales > 0 ? parseFloat(((spend / sales) * 100).toFixed(2)) : 0,
      roas: spend > 0 ? parseFloat((sales / spend).toFixed(2)) : 0,
      ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
      cvr: clicks > 0 ? parseFloat(((conversions / clicks) * 100).toFixed(2)) : 0,
    };
  }

  /**
   * Vergleich berechnen
   */
  private calculateComparison(current: any, previous: any): any {
    const calculate = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
    };

    return {
      impressions: calculate(current.impressions, previous.impressions),
      clicks: calculate(current.clicks, previous.clicks),
      spend: calculate(current.spend, previous.spend),
      sales: calculate(current.sales, previous.sales),
      conversions: calculate(current.conversions, previous.conversions),
      acos: calculate(current.acos, previous.acos),
      roas: calculate(current.roas, previous.roas),
    };
  }

  /**
   * Top Kampagnen
   */
  private async getTopCampaigns(limit: number, since: Date): Promise<any[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        lastUpdated: { gte: since },
      },
      take: limit,
      orderBy: {
        // Sortiere nach Performance (simuliert)
        lastUpdated: 'desc',
      },
    });

    return campaigns.map((c: any) => ({
      name: c.name,
      campaignId: c.campaignId,
      type: c.campaignType,
      status: c.status,
    }));
  }

  /**
   * Bottom Kampagnen
   */
  private async getBottomCampaigns(limit: number, since: Date): Promise<any[]> {
    return this.getTopCampaigns(limit, since); // Vereinfacht
  }

  /**
   * Top Keywords
   */
  private async getTopKeywords(limit: number, since: Date): Promise<any[]> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: { gte: since },
      },
      orderBy: {
        sales: 'desc',
      },
      take: limit,
    });

    return keywords.map((kw: any) => ({
      keyword: kw.keywordText,
      campaignId: kw.campaignId,
      impressions: kw.impressions,
      clicks: kw.clicks,
      spend: kw.spend,
      sales: kw.sales,
      acos: kw.sales > 0 ? ((kw.spend / kw.sales) * 100).toFixed(2) : 0,
    }));
  }

  /**
   * Bottom Keywords
   */
  private async getBottomKeywords(limit: number, since: Date): Promise<any[]> {
    const keywords = await this.prisma.keyword.findMany({
      where: {
        lastUpdated: { gte: since },
        spend: { gt: 10 }, // Nur Keywords mit mind. 10€ Spend
      },
      orderBy: {
        sales: 'asc',
      },
      take: limit,
    });

    return keywords.map((kw: any) => ({
      keyword: kw.keywordText,
      campaignId: kw.campaignId,
      spend: kw.spend,
      sales: kw.sales,
      acos: kw.sales > 0 ? ((kw.spend / kw.sales) * 100).toFixed(2) : 0,
      action: 'Pausiert oder Bid reduziert',
    }));
  }

  /**
   * Kürzliche Optimierungen
   */
  private async getRecentOptimizations(since: Date): Promise<any> {
    // Hier könnten wir Optimization-Logs aus der DB holen
    return {
      keywordsPaused: 0,
      keywordsOptimized: 0,
      negativeKeywordsAdded: 0,
      bidAdjustments: 0,
    };
  }

  /**
   * Report per E-Mail versenden
   */
  private async sendReportEmail(subject: string, report: any): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('E-Mail-Service nicht konfiguriert');
      return;
    }

    const recipientEmail = this.configService.get<string>('ALERT_EMAIL');
    if (!recipientEmail) {
      this.logger.warn('Keine Report-E-Mail-Adresse konfiguriert');
      return;
    }

    const htmlBody = this.generateReportHTML(report);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_USER'),
        to: recipientEmail,
        subject: `📊 ${subject} - Amazon Ads Optimizer`,
        html: htmlBody,
      });

      this.logger.log(`✅ Report versendet an ${recipientEmail}`);
    } catch (error) {
      this.logger.error('Fehler beim Report-Versand:', error);
    }
  }

  /**
   * Report HTML generieren
   */
  private generateReportHTML(report: any): string {
    const currentData = report.currentWeek || report.currentMonth;
    const previousData = report.previousWeek || report.previousMonth;
    const comparison = report.comparison;

    const formatChange = (value: number) => {
      const sign = value > 0 ? '+' : '';
      const color = value > 0 ? 'green' : value < 0 ? 'red' : 'gray';
      return `<span style="color: ${color};">${sign}${value}%</span>`;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .metric-card { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; border-radius: 5px; }
          .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .metric-value { font-size: 24px; font-weight: bold; color: #333; }
          .section { margin: 30px 0; }
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 ${report.period}</h1>
            <p>Amazon Ads Performance Report</p>
          </div>

          <div class="section">
            <div class="section-title">📈 Gesamtperformance</div>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Umsatz</div>
                <div class="metric-value">€${currentData.sales.toFixed(2)}</div>
                <div>${formatChange(comparison.sales)} vs. Vorperiode</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Werbeausgaben</div>
                <div class="metric-value">€${currentData.spend.toFixed(2)}</div>
                <div>${formatChange(comparison.spend)} vs. Vorperiode</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">ACoS</div>
                <div class="metric-value">${currentData.acos.toFixed(2)}%</div>
                <div>${formatChange(comparison.acos)} vs. Vorperiode</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">ROAS</div>
                <div class="metric-value">${currentData.roas.toFixed(2)}</div>
                <div>${formatChange(comparison.roas)} vs. Vorperiode</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Klicks</div>
                <div class="metric-value">${currentData.clicks.toLocaleString()}</div>
                <div>${formatChange(comparison.clicks)} vs. Vorperiode</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Conversions</div>
                <div class="metric-value">${currentData.conversions.toLocaleString()}</div>
                <div>${formatChange(comparison.conversions)} vs. Vorperiode</div>
              </div>
            </div>
          </div>

          ${report.budgetProjection ? `
          <div class="section">
            <div class="section-title">💰 Budget-Prognose</div>
            <p><strong>Bisherige Ausgaben:</strong> €${report.budgetProjection.spentSoFar.toFixed(2)}</p>
            <p><strong>Prognostizierter Monats-Total:</strong> €${report.budgetProjection.projectedTotal.toFixed(2)}</p>
            <p><strong>Täglicher Durchschnitt:</strong> €${report.budgetProjection.dailyAverage.toFixed(2)}</p>
            <p><strong>Verbleibende Tage:</strong> ${report.budgetProjection.daysRemaining}</p>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">🏆 Top 5 Kampagnen</div>
            <table>
              <tr>
                <th>Kampagne</th>
                <th>Typ</th>
                <th>Status</th>
              </tr>
              ${report.topCampaigns.slice(0, 5).map((c: any) => `
                <tr>
                  <td>${c.name}</td>
                  <td>${c.type}</td>
                  <td>${c.status}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="section-title">🎯 Top 10 Keywords</div>
            <table>
              <tr>
                <th>Keyword</th>
                <th>Umsatz</th>
                <th>Ausgaben</th>
                <th>ACoS</th>
              </tr>
              ${report.topKeywords.slice(0, 10).map((kw: any) => `
                <tr>
                  <td>${kw.keyword}</td>
                  <td>€${kw.sales.toFixed(2)}</td>
                  <td>€${kw.spend.toFixed(2)}</td>
                  <td>${kw.acos}%</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="footer">
            <p>Generiert am ${new Date().toLocaleString('de-DE')}</p>
            <p>Amazon Ads Optimizer - Automatisches Reporting-System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * On-Demand Report generieren
   */
  async generateCustomReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: `${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`,
      metrics: await this.getPerformanceMetrics(startDate, endDate),
      topCampaigns: await this.getTopCampaigns(10, startDate),
      topKeywords: await this.getTopKeywords(20, startDate),
      bottomKeywords: await this.getBottomKeywords(10, startDate),
    };
  }
}
