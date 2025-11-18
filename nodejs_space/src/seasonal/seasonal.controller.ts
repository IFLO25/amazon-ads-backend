
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeasonalService } from './seasonal.service';

@ApiTags('Seasonal Management')
@Controller('seasonal')
export class SeasonalController {
  constructor(private seasonalService: SeasonalService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Saisonale Statistiken abrufen' })
  async getStats() {
    const stats = await this.seasonalService.getSeasonalStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Post('apply')
  @ApiOperation({ summary: 'Saisonale Anpassungen manuell anwenden' })
  async applyAdjustments() {
    await this.seasonalService.applySeasonalAdjustments();
    return {
      success: true,
      message: 'Saisonale Anpassungen durchgeführt',
    };
  }
}
