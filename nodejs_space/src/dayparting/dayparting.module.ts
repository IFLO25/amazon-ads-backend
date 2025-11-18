
import { Module } from '@nestjs/common';
import { DaypartingService } from './dayparting.service';
import { DaypartingController } from './dayparting.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DaypartingController],
  providers: [DaypartingService],
  exports: [DaypartingService],
})
export class DaypartingModule {}
