import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SignalService } from '../signals/signal.service';
import { RmqService } from '@app/common/rmq/rmq.service';
import { CreateXrayDto } from '../signals/dto/create-xray.dto';


@Injectable()
export class XrayConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(XrayConsumer.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly signalService: SignalService,
  ) {}

  onApplicationBootstrap() {
    this.rmqService.consume('xray_queue', async (payload: unknown) => {
      try {
        // Parse and validate the incoming data
        const xrayData = this.parseXrayData(payload);

        // Extract deviceId and timestamp
        const { deviceId, time } = xrayData;

        // Calculate data length if not provided
        if (!xrayData.dataLength) {
          xrayData.dataLength = this.calculateDataLength(payload);
        }

        this.logger.log(
          `Received x-ray data from device: ${deviceId}, timestamp: ${time}, length: ${xrayData.dataLength} bytes`
        );

        await this.signalService.processAndSaveSignal(xrayData);
      } catch (error) {
        this.logger.error('Error processing x-ray message', error);
      }
    });
  }

  private parseXrayData(rawData: unknown): CreateXrayDto {
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid data format: expected object');
    }

    const data = rawData as Record<string, unknown>;

    if (!data.deviceId || typeof data.deviceId !== 'string') {
      throw new Error('Invalid deviceId: expected non-empty string');
    }

    if (!data.time) {
      throw new Error('Invalid time: timestamp is required');
    }

    // Parse timestamp
    let parsedTime: Date;
    if (data.time instanceof Date) {
      parsedTime = data.time;
    } else if (typeof data.time === 'string') {
      parsedTime = new Date(data.time);
      if (isNaN(parsedTime.getTime())) {
        throw new Error('Invalid time format: unable to parse timestamp');
      }
    } else if (typeof data.time === 'number') {
      parsedTime = new Date(data.time);
    } else {
      throw new Error('Invalid time format: expected Date, string, or number');
    }

    return {
      deviceId: data.deviceId as string,
      time: parsedTime.toISOString(),
      dataLength: typeof data.dataLength === 'number' ? data.dataLength : 0,
      dataVolume: typeof data.dataVolume === 'number' ? data.dataVolume : 0,
      kV: typeof data.kV === 'number' ? data.kV : undefined,
      mA: typeof data.mA === 'number' ? data.mA : undefined,
      exposureTime:
        typeof data.exposureTime === 'number' ? data.exposureTime : undefined,
      projectionType:
        typeof data.projectionType === 'string'
          ? data.projectionType
          : undefined,
    };
  }

  private calculateDataLength(rawData: unknown): number {
    try {
      const dataString = JSON.stringify(rawData);
      return Buffer.byteLength(dataString, 'utf8');
    } catch {
      this.logger.warn('Failed to calculate data length, using fallback value');
      return 0;
    }
  }
}