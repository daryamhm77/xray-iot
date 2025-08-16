import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ProducerModule } from './producer.module';

async function bootstrap() {
  const app = await NestFactory.create(ProducerModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  const config = app.get<ConfigService>(ConfigService);
  const port: number = Number(config.get<string>('PRODUCER_PORT')) || 3001;
  const rmqUri: string =
    config.get<string>('RABBIT_MQ_URI') ?? 'amqp://localhost:5672';
  await app.listen(port);
  const host = (() => {
    try {
      return new URL(rmqUri).host;
    } catch {
      return 'unknown-host';
    }
  })();
  const logger = new Logger('Producer');
  logger.log(`Producer running at http://localhost:${port}/api`);
  logger.log(`RabbitMQ target: ${host}`);
}

bootstrap();
