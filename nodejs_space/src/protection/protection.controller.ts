
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProtectionService } from './protection.service';

@ApiTags('Budget Protection')
@Controller('protection')
export class ProtectionController {
  constructor(private protectionService: ProtectionService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Budget-Schutz Einstellungen abrufen' })
  async getSettings() {
    const settings = await this.protectionService.getProtectionSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Post('check')
  @ApiOperation({ summary: 'Budget-Schutz manuell prüfen' })
  async checkProtection() {
    await this.protectionService.checkBudgetProtection();
    return {
      success: true,
      message: 'Budget-Schutz-Prüfung durchgeführt',
    };
  }
}
