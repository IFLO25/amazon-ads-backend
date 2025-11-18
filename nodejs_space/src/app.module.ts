
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AmazonAuthModule } from './amazon-auth/amazon-auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { OptimizationModule } from './optimization/optimization.module';
import { BudgetModule } from './budget/budget.module';
import { KeywordsModule } from './keywords/keywords.module';
import { ConfigController } from './config/config.controller';
import { StatusController } from './status/status.controller';

// ✨ NEUE PROFI-FEATURES
import { AlertsModule } from './alerts/alerts.module';
import { DaypartingModule } from './dayparting/dayparting.module';
import { PlacementModule } from './placement/placement.module';
import { ReportsModule } from './reports/reports.module';
import { SeasonalModule } from './seasonal/seasonal.module';
import { AutoCampaignsModule } from './auto-campaigns/auto-campaigns.module';
import { ProtectionModule } from './protection/protection.module';
import { KeywordResearchModule } from './keyword-research/keyword-research.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    PrismaModule,
    AmazonAuthModule,
    CampaignsModule,
    OptimizationModule,
    BudgetModule,
    KeywordsModule,
    // ✨ NEUE PROFI-FEATURES
    AlertsModule,
    DaypartingModule,
    PlacementModule,
    ReportsModule,
    SeasonalModule,
    AutoCampaignsModule,
    ProtectionModule,
    KeywordResearchModule,
    DashboardModule,
    // 🔥 24/7 AUTOMATISCHE OPTIMIERUNG
    SchedulerModule,
  ],
  controllers: [AppController, ConfigController, StatusController],
  providers: [AppService],
})
export class AppModule {}
