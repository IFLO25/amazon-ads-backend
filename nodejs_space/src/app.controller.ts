
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'Amazon Ads Optimizer API',
      version: '2.0.0',
      status: 'running',
      endpoints: {
        campaigns: '/api/campaigns',
        keywords: '/api/keywords',
        optimization: '/api/optimization/status',
        health: '/api/optimization/health'
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
