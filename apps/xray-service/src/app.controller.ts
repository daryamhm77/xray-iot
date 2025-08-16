import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: 'ok',
      service: 'X-ray Service',
      timestamp: new Date().toISOString(),
    };
  }
}
