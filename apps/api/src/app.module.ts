import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module.js';
import { FilesModule } from './files/files.module.js';
import { PdfModule } from './pdf/pdf.module.js';
import { config, validateEnv } from './config.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: config.DB_PATH,
      autoLoadEntities: true,
      synchronize: true,
    }),
    // Baseline limit for the whole API; the PDF endpoint sets its own
    // tighter limit since each request spins up a real headless browser page.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    PdfModule,
    AuthModule,
    FilesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
