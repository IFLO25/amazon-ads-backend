
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
  logger.log(`🚀 Amazon Advertising Service started on port ${port}`);
  logger.log(`📚 Swagger: http://localhost:${port}/api-docs`);
  
  // Check critical env vars
  const clientId = configService.get('amazon.clientId');
  const profileId = configService.get('amazon.profileId');
  
  if (!clientId || !profileId) {
    logger.error('❌ Missing critical environment variables!');
  }
}

bootstrap();
