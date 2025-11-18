
import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AutoCampaignsService } from './auto-campaigns.service';

@ApiTags('Auto Campaign Creation')
@Controller('auto-campaigns')
export class AutoCampaignsController {
  constructor(private autoCampaignsService: AutoCampaignsService) {}

  @Post('create-for-new-products')
  @ApiOperation({ summary: 'Kampagnen für neue Produkte erstellen' })
  async createForNewProducts() {
    await this.autoCampaignsService.createCampaignsForNewProducts();
    return {
      success: true,
      message: 'Neue Produkt-Kampagnen erstellt',
    };
  }

  @Post('scale')
  @ApiOperation({ summary: 'Erfolgreiche Kampagnen skalieren' })
  async scaleCampaigns() {
    await this.autoCampaignsService.scaleSuccessfulCampaigns();
    return {
      success: true,
      message: 'Kampagnen-Skalierung durchgeführt',
    };
  }
}
