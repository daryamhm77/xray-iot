import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SignalModule } from './signals/signal.module';
import { RmqService } from '@app/common/rmq/rmq.service';
import { XrayConsumer } from './consumer/xray-consumer';
import { AppController } from './app.controller';
import { DatabaseModule } from '@app/common/database/database.module';

@Module({
  imports: [
    // Keep Config global so main.ts and services can read env vars
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/xray-service/.env',
    }),
    SignalModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [RmqService, XrayConsumer],
})
export class AppModule {}
