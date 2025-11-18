
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DaypartingService } from './dayparting.service';

@ApiTags('Dayparting')
@Controller('dayparting')
export class DaypartingController {
  constructor(private daypartingService: DaypartingService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Dayparting-Regeln manuell anwenden' })
  async applyDayparting() {
    await this.daypartingService.applyDayparting();
    return {
      success: true,
      message: 'Dayparting-Anpassungen durchgeführt',
    };
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Beste Zeiten analysieren' })
  async analyzeBestTimes() {
    const analysis = await this.daypartingService.analyzeBestTimes();
    return {
      success: true,
      data: analysis,
    };
  }
}
