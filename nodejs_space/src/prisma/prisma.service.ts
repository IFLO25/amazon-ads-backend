
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  async onModuleInit() {
    // Only connect if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      try {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('✅ Database connected');
      } catch (error) {
        this.logger.warn('⚠️ Database connection failed, running without DB');
        this.logger.warn(error.message);
      }
    } else {
      this.logger.warn('⚠️ DATABASE_URL not set, running without database');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
