import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { swaggerConfigInit } from '@app/common/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

 
  app.setGlobalPrefix('api');


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, 
      forbidNonWhitelisted: true, 
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3009;

  swaggerConfigInit(app);

  await app.listen(port);
  logger.log(`🚀 X-ray service running at http://localhost:${port}`);
  logger.log(`🚀 Swagger running at http://localhost:${port}/swagger`);
}
bootstrap();
