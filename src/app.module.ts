import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AmazonAuthModule } from './amazon-auth/amazon-auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { OptimizationModule } from './optimization/optimization.module';
import { KeywordsModule } from './keywords/keywords.module';
import { ConfigController } from './config/config.controller';
import { StatusController } from './status/status.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { KeywordResearchModule } from './keyword-research/keyword-research.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HttpModule,
    AmazonAuthModule,
    CampaignsModule,
    OptimizationModule,
    KeywordsModule,
    DashboardModule,
    ReportsModule,
    KeywordResearchModule,
  ],
  controllers: [AppController, ConfigController, StatusController],
  providers: [AppService],
})
export class AppModule {}
