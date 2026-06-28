import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
    bodyLimit: 25 * 1024 * 1024, // rendered preview HTML + CSS can be a few MB
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  await app.register(helmet as any);

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3003')
    .split(',')
    .map(o => o.trim());
  const allowAll = corsOrigins.includes('*');
  app.enableCors({
    origin: allowAll ? true : corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const port = Number.parseInt(process.env.PORT ?? '3004', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`\nresomd PDF server running at http://localhost:${port}/v1`);
}

bootstrap();
