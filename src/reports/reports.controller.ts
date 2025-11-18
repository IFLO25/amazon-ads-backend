
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('weekly')
  @ApiOperation({ summary: 'Wöchentlichen Report manuell versenden' })
  async sendWeeklyReport() {
    await this.reportsService.sendWeeklyReport();
    return {
      success: true,
      message: 'Wöchentlicher Report wurde versendet',
    };
  }

  @Post('monthly')
  @ApiOperation({ summary: 'Monatlichen Report manuell versenden' })
  async sendMonthlyReport() {
    await this.reportsService.sendMonthlyReport();
    return {
      success: true,
      message: 'Monatlicher Report wurde versendet',
    };
  }

  @Get('custom')
  @ApiOperation({ summary: 'Custom Report generieren' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async generateCustomReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const report = await this.reportsService.generateCustomReport(start, end);
    
    return {
      success: true,
      data: report,
    };
  }
}
