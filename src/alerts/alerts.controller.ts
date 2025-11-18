
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(
    private alertsService: AlertsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Alerts abrufen' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'severity', required: false, enum: ['INFO', 'WARNING', 'CRITICAL'] })
  async getAlerts(
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
  ) {
    const alerts = await this.prisma.alert.findMany({
      where: severity ? { severity } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return {
      success: true,
      count: alerts.length,
      alerts,
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test-Alert senden' })
  async testAlert() {
    await this.alertsService.sendAlert({
      type: 'BUDGET_WARNING',
      severity: 'INFO',
      title: '🧪 Test-Alert',
      message: 'Dies ist ein Test-Alert um zu prüfen ob das E-Mail-System funktioniert.',
      data: { test: true, timestamp: new Date() },
    });

    return {
      success: true,
      message: 'Test-Alert wurde gesendet',
    };
  }

  @Get('check-budget')
  @ApiOperation({ summary: 'Budget-Checks manuell ausführen' })
  async checkBudget() {
    await this.alertsService.checkBudgetAlerts();
    return {
      success: true,
      message: 'Budget-Checks abgeschlossen',
    };
  }

  @Get('check-performance')
  @ApiOperation({ summary: 'Performance-Checks manuell ausführen' })
  async checkPerformance() {
    await this.alertsService.checkPerformanceAlerts();
    return {
      success: true,
      message: 'Performance-Checks abgeschlossen',
    };
  }
}
