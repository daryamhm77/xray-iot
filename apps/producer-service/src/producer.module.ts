import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RmqService } from '@app/common/rmq/rmq.service';
import { ProducerController } from './producer.controller';
import { ProducerService } from './producer.service';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBIT_MQ_URI: Joi.string().required(),
      }),
      envFilePath: ['apps/producer-service/.env', '.env'],
    }),
  ],
  controllers: [ProducerController],
  providers: [ProducerService, RmqService],
})
export class ProducerModule {}


