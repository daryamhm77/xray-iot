import { Injectable, Logger } from '@nestjs/common';
import { RmqService } from '@app/common/rmq/rmq.service';

export interface XrayPayload {
  deviceId: string;
  time: string;
  dataLength: number;
  dataVolume: number;
  kV?: number;
  mA?: number;
  exposureTime?: number;
  projectionType?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
}

@Injectable()
export class ProducerService {
  private readonly logger = new Logger(ProducerService.name);

  constructor(private readonly rmqService: RmqService) {}

  generateSample(
    deviceId: string,
    overrides?: Partial<XrayPayload>,
  ): XrayPayload {
    const base = {
      deviceId,
      time: new Date().toISOString(),
      dataLength: 1024 + Math.floor(Math.random() * 4096),
      dataVolume: 2048 + Math.floor(Math.random() * 8192),
      kV: 80 + Math.floor(Math.random() * 40),
      mA: 100 + Math.floor(Math.random() * 300),
      exposureTime: 50 + Math.floor(Math.random() * 150),
      projectionType: Math.random() > 0.5 ? 'AP' : 'PA',
      latitude: 51.339764 + (Math.random() - 0.5) * 0.001,
      longitude: 12.339223833333334 + (Math.random() - 0.5) * 0.001, 
      speed: 0.5 + Math.random() * 3.0,
    } satisfies XrayPayload;

    const payload = { ...base, ...overrides };
    return payload;
  }

  sendSample(deviceId: string, overrides?: Partial<XrayPayload>): void {
    const payload = this.generateSample(deviceId, overrides);
    this.rmqService.sendToQueue('xray_queue', payload);
    this.logger.log(`📤 Sent x-ray sample for device ${payload.deviceId}`);
  }

  async sendBatch(deviceId: string, count = 5): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.sendSample(deviceId);

      await new Promise((res) => setTimeout(res, 100));
    }
    this.logger.log(`📤 Sent batch of ${count} samples for ${deviceId}`);
  }
}
