
import { Module } from '@nestjs/common';
import { OptimizationService } from './optimization.service';
import { OptimizationController } from './optimization.controller';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BudgetModule } from '../budget/budget.module';
import { KeywordsModule } from '../keywords/keywords.module';

@Module({
  imports: [CampaignsModule, BudgetModule, KeywordsModule],
  controllers: [OptimizationController],
  providers: [OptimizationService],
  exports: [OptimizationService],
})
export class OptimizationModule {}
