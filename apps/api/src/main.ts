import { buildAuthenticatedRouter } from '@adminjs/fastify';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { DataSource } from 'typeorm';

import { ADMIN_ENTITIES, createAdminPanel } from './admin-panel/admin-panel.js';
import { AppModule } from './app.module.js';

async function setupAdminPanel(app: NestFastifyApplication) {
  const dataSource = app.get(DataSource);
  for (const entity of ADMIN_ENTITIES) {
    entity.useDataSource(dataSource);
  }

  const adminJs = createAdminPanel();

  const adminUser = process.env.ADMIN_USER ?? 'admin@resomd.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change-me';
  const cookieSecret =
    process.env.ADMIN_SESSION_SECRET ?? 'dev-admin-secret-change-me-32-chars';

  // The Fastify instance type that @adminjs/fastify expects comes from its
  // own nested fastify install, which pnpm resolves separately from ours —
  // structurally compatible at runtime, just not nominally identical.
  const fastifyInstance = app.getHttpAdapter().getInstance() as unknown as Parameters<
    typeof buildAuthenticatedRouter
  >[2];

  // Registering inside a child plugin context encapsulates the content-type
  // parsers @adminjs/fastify adds (formbody, multipart, cookie, session) so
  // they don't collide with the parsers Nest registers on the root instance.
  await fastifyInstance.register(async scopedApp => {
    await buildAuthenticatedRouter(
      adminJs,
      {
        authenticate: async (email, password) => {
          if (email === adminUser && password === adminPassword) {
            return { email };
          }
          return null;
        },
        cookieName: 'resomd-admin',
        cookiePassword: cookieSecret,
      },
      scopedApp,
      {
        saveUninitialized: true,
        secret: cookieSecret,
        cookie: {
          httpOnly: process.env.NODE_ENV === 'production',
          secure: process.env.NODE_ENV === 'production',
        },
      }
    );
  });
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
    bodyLimit: 25 * 1024 * 1024, // rendered preview HTML + CSS can be a few MB
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  // AdminJS's bundled frontend needs inline scripts/styles, which the
  // default helmet CSP blocks — disable CSP rather than fight it.
  await app.register(helmet as any, { contentSecurityPolicy: false });

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

  await setupAdminPanel(app);

  const port = Number.parseInt(process.env.PORT ?? '3004', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`\nresomd PDF server running at http://localhost:${port}/v1`);
  console.log(`resomd admin panel running at http://localhost:${port}/admin`);
}

bootstrap();
