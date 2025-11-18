
import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlacementService } from './placement.service';

@ApiTags('Placement Optimization')
@Controller('placement')
export class PlacementController {
  constructor(private placementService: PlacementService) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Placement-Optimierung manuell ausführen' })
  async optimizePlacements() {
    await this.placementService.optimizePlacements();
    return {
      success: true,
      message: 'Placement-Optimierung durchgeführt',
    };
  }

  @Get('analysis/:campaignId')
  @ApiOperation({ summary: 'Placement-Performance analysieren' })
  async analyzePlacement(@Param('campaignId') campaignId: string) {
    const analysis = await this.placementService.analyzePlacementPerformance(campaignId);
    return {
      success: true,
      data: analysis,
    };
  }

  @Get('settings/:campaignId')
  @ApiOperation({ summary: 'Placement-Einstellungen abrufen' })
  async getSettings(@Param('campaignId') campaignId: string) {
    const settings = await this.placementService.getPlacementSettings(campaignId);
    return {
      success: true,
      data: settings,
    };
  }
}
