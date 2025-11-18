
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KeywordResearchService } from './keyword-research.service';

@ApiTags('Keyword Research')
@Controller('keyword-research')
export class KeywordResearchController {
  constructor(private keywordResearchService: KeywordResearchService) {}

  @Post('research')
  @ApiOperation({ summary: 'Neue Keywords automatisch recherchieren' })
  async researchKeywords() {
    await this.keywordResearchService.researchNewKeywords();
    return {
      success: true,
      message: 'Keyword-Recherche durchgeführt',
    };
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Keyword-Opportunities analysieren' })
  async analyzeOpportunities() {
    const analysis = await this.keywordResearchService.analyzeKeywordOpportunities();
    return {
      success: true,
      data: analysis,
    };
  }
}
