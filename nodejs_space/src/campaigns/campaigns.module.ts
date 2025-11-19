
import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { DebugController } from './debug.controller';
import { AmazonAuthModule } from '../amazon-auth/amazon-auth.module';

@Module({
  imports: [AmazonAuthModule],
  controllers: [CampaignsController, DebugController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
