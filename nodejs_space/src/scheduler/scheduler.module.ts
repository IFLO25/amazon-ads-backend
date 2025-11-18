
import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { OptimizationModule } from '../optimization/optimization.module';

@Module({
  imports: [CampaignsModule, KeywordsModule, OptimizationModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
