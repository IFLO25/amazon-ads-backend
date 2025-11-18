
import { Module } from '@nestjs/common';
import { SeasonalService } from './seasonal.service';
import { SeasonalController } from './seasonal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeasonalController],
  providers: [SeasonalService],
  exports: [SeasonalService],
})
export class SeasonalModule {}
