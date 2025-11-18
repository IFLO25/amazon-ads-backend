
import { Module } from '@nestjs/common';
import { AutoCampaignsService } from './auto-campaigns.service';
import { AutoCampaignsController } from './auto-campaigns.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AmazonAuthModule } from '../amazon-auth/amazon-auth.module';

@Module({
  imports: [PrismaModule, AmazonAuthModule],
  controllers: [AutoCampaignsController],
  providers: [AutoCampaignsService],
  exports: [AutoCampaignsService],
})
export class AutoCampaignsModule {}
