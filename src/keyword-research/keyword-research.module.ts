
import { Module } from '@nestjs/common';
import { KeywordResearchService } from './keyword-research.service';
import { KeywordResearchController } from './keyword-research.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AmazonAuthModule } from '../amazon-auth/amazon-auth.module';

@Module({
  imports: [PrismaModule, AmazonAuthModule],
  controllers: [KeywordResearchController],
  providers: [KeywordResearchService],
  exports: [KeywordResearchService],
})
export class KeywordResearchModule {}
