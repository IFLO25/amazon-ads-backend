
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Amazon Advertising Automation API')
    .setDescription(
      'Vollautomatisches Amazon Advertising Management System für Sponsored Products auf Amazon.de',
    )
    .setVersion('1.0')
    .addTag('config', 'Konfigurations-Endpoints')
    .addTag('campaigns', 'Kampagnen-Management')
    .addTag('optimization', 'Optimierungs-Funktionen')
    .addTag('budget', 'Budget-Management')
    .addTag('status', 'System-Status')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  // Log environment variables status (without revealing actual values)
  const configService = app.get(ConfigService);
  logger.log('='.repeat(60));
  logger.log('🚀 Amazon Advertising Automation Service STARTED');
  logger.log('='.repeat(60));
  logger.log(`📍 Port: ${port}`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api-docs`);
  logger.log(`🌐 API Base: http://localhost:${port}/api`);
  logger.log('='.repeat(60));
  logger.log('🔐 Environment Variables Status:');
  logger.log(`   - AMAZON_CLIENT_ID: ${configService.get('amazon.clientId') ? '✅ Set' : '❌ Missing'}`);
  logger.log(`   - AMAZON_CLIENT_SECRET: ${configService.get('amazon.clientSecret') ? '✅ Set' : '❌ Missing'}`);
  logger.log(`   - AMAZON_REFRESH_TOKEN: ${configService.get('amazon.refreshToken') ? '✅ Set' : '❌ Missing'}`);
  logger.log(`   - AMAZON_ADVERTISING_ACCOUNT_ID: ${configService.get('amazon.advertisingAccountId') ? '✅ Set' : '❌ Missing'}`);
  logger.log(`   - DATABASE_URL: ${configService.get('database.url') ? '✅ Set' : '❌ Missing'}`);
  logger.log('='.repeat(60));
  logger.log('🎯 Routes:');
  logger.log('   - GET  /api/campaigns');
  logger.log('   - POST /api/campaigns/sync');
  logger.log('   - GET  /api/keywords');
  logger.log('   - POST /api/optimize/run');
  logger.log('='.repeat(60));
}

bootstrap();
