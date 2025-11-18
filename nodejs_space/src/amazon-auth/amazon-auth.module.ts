
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AmazonAuthService } from './amazon-auth.service';
import { AmazonApiClient } from './amazon-api.client';
import { AmazonAuthController } from './amazon-auth.controller';

@Module({
  imports: [HttpModule],
  controllers: [AmazonAuthController],
  providers: [AmazonAuthService, AmazonApiClient],
  exports: [AmazonAuthService, AmazonApiClient],
})
export class AmazonAuthModule {}
