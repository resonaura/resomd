import { buildAuthenticatedRouter } from '@adminjs/fastify';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';

import { ADMIN_ENTITIES, createAdminPanel } from './admin-panel/admin-panel.js';
import { AppModule } from './app.module.js';
import { config } from './config.js';
import { generateEnvExample } from './config.helpers.js';

async function setupAdminPanel(app: NestFastifyApplication) {
  const dataSource = app.get(DataSource);
  for (const entity of ADMIN_ENTITIES) {
    entity.useDataSource(dataSource);
  }

  const adminJs = createAdminPanel();

  const adminUser = config.ADMIN_USER;
  const adminPasswordHash = config.ADMIN_PASSWORD;
  const cookieSecret = config.ADMIN_SESSION_SECRET;

  // Warn if the password doesn't look like a bcrypt hash
  if (!adminPasswordHash.startsWith('$2')) {
    new Logger('SetupAdminPanel').warn(
      'ADMIN_PASSWORD does not look like a bcrypt hash — Run `pnpm setup` to generate a pre-hashed password.'
    );
  }

  // The Fastify instance type that @adminjs/fastify expects comes from its
  // own nested fastify install, which pnpm resolves separately from ours —
  // structurally compatible at runtime, just not nominally identical.
  const fastifyInstance = app
    .getHttpAdapter()
    .getInstance() as unknown as Parameters<typeof buildAuthenticatedRouter>[2];

  // Registering inside a child plugin context encapsulates the content-type
  // parsers @adminjs/fastify adds (formbody, multipart, cookie, session) so
  // they don't collide with the parsers Nest registers on the root instance.
  await fastifyInstance.register(async scopedApp => {
    await buildAuthenticatedRouter(
      adminJs,
      {
        authenticate: async (email, password) => {
          if (email !== adminUser) return null;
          // ADMIN_PASSWORD is a bcrypt hash — compare against it.
          if (adminPasswordHash.startsWith('$2')) {
            const ok = await bcrypt.compare(password, adminPasswordHash);
            return ok ? { email } : null;
          }
          // Fallback: plaintext comparison (not recommended)
          return password === adminPasswordHash ? { email } : null;
        },
        cookieName: 'resomd-admin',
        cookiePassword: cookieSecret,
      },
      scopedApp,
      {
        saveUninitialized: true,
        secret: cookieSecret,
        cookie: {
          httpOnly: config.NODE_ENV === 'production',
          secure: config.NODE_ENV === 'production',
        },
      }
    );
  });
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: config.NODE_ENV === 'development',
    bodyLimit: 25 * 1024 * 1024, // rendered preview HTML + CSS can be a few MB
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  // AdminJS's bundled frontend needs inline scripts/styles, which the
  // default helmet CSP blocks — disable CSP rather than fight it.
  await app.register(helmet as any, { contentSecurityPolicy: false });

  const corsOrigins = config.CORS_ORIGINS.split(',').map(o => o.trim());
  const allowAll = corsOrigins.includes('*');
  app.enableCors({
    origin: allowAll ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  if (config.NODE_ENV === 'development') {
    await generateEnvExample();
  }

  const port = Number.parseInt(config.PORT, 10);
  await app.listen(port, '0.0.0.0');

  console.log(`\nresomd PDF server running at http://localhost:${port}/v1`);
  console.log(`resomd admin panel running at http://localhost:${port}/admin`);
}

bootstrap();
