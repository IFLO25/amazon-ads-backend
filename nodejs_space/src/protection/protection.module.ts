
import { Module } from '@nestjs/common';
import { ProtectionService } from './protection.service';
import { ProtectionController } from './protection.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [ProtectionController],
  providers: [ProtectionService],
  exports: [ProtectionService],
})
export class ProtectionModule {}
