
import { Module } from '@nestjs/common';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AmazonAuthModule } from '../amazon-auth/amazon-auth.module';

@Module({
  imports: [PrismaModule, AmazonAuthModule],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
