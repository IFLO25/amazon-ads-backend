"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Amazon Advertising Automation API')
        .setDescription('Vollautomatisches Amazon Advertising Management System für Sponsored Products auf Amazon.de')
        .setVersion('1.0')
        .addTag('config', 'Konfigurations-Endpoints')
        .addTag('campaigns', 'Kampagnen-Management')
        .addTag('optimization', 'Optimierungs-Funktionen')
        .addTag('budget', 'Budget-Management')
        .addTag('status', 'System-Status')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
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
//# sourceMappingURL=main.js.map