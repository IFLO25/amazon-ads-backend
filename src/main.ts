
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║  Amazon Advertising Automation Service                     ║
  ║  Backend läuft auf: http://localhost:${port}                ║
  ║  Swagger API Docs: http://localhost:${port}/api-docs        ║
  ╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
