
import { Controller, Post, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { KeywordsService } from './keywords.service';

@ApiTags('Keywords')
@Controller('keywords')
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post('optimize')
  @ApiOperation({
    summary: '🎯 Vollautomatische Keyword-Optimierung',
    description:
      'Führt eine vollständige Keyword-Optimierung durch:\n' +
      '- Fügt negative Keywords hinzu (schlechte Performance)\n' +
      '- Erstellt positive Keywords (gute Performance)\n' +
      '- Pausiert schlecht performende Keywords\n' +
      '- Passt Gebote automatisch an',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimierung erfolgreich durchgeführt',
    schema: {
      example: {
        negativeKeywordsAdded: 15,
        positiveKeywordsAdded: 8,
        keywordsPaused: 5,
        bidsAdjusted: 23,
      },
    },
  })
  async optimizeKeywords() {
    return this.keywordsService.optimizeAllKeywords();
  }

  @Get('history')
  @ApiOperation({
    summary: '📊 Optimierungs-Historie abrufen',
    description: 'Zeigt alle Keyword-Optimierungen der letzten X Tage',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Anzahl Tage (Standard: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimierungs-Historie erfolgreich abgerufen',
  })
  async getHistory(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.keywordsService.getOptimizationHistory(numDays);
  }
}
