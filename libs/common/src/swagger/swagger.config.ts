import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export const swaggerConfigInit = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('X-ray')
    .setDescription('Backend of X-ray')
    .setVersion('v0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
};