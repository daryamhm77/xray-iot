import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalService } from './signal.service';
import { SignalController } from './signal.controller';
import { DatabaseModule } from '@app/common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { XrayData, XrayDataSchema } from './schema/xray-schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        PORT: Joi.number().required(),
      }),
      envFilePath: './apps/xray-service/.env',
    }),
    DatabaseModule,
    MongooseModule.forFeature([
      { name: XrayData.name, schema: XrayDataSchema },
    ]),
  ],
  controllers: [SignalController],
  providers: [SignalService],
  exports: [SignalService],
})
export class SignalModule {}
