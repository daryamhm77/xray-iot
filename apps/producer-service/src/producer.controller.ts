import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProducerService, XrayPayload } from './producer.service';
import { SendXrayDto } from './dto/send-xray.dto';

@Controller('producer')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  @Get('health')
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Post('send')
  send(@Body() dto: SendXrayDto) {
    this.producerService.sendSample(dto.deviceId, dto as Partial<XrayPayload>);
    return { success: true };
  }

  @Post('send/:deviceId/batch')
  async sendBatch(
    @Param('deviceId') deviceId: string,
    @Query('count') count?: string,
  ) {
    const n = Number(count ?? '5');
    await this.producerService.sendBatch(deviceId, Number.isFinite(n) ? n : 5);
    return { success: true, count: Number.isFinite(n) ? n : 5 };
  }

  @Get('preview/:deviceId')
  preview(@Param('deviceId') deviceId: string) {
    return this.producerService.generateSample(deviceId);
  }
}


