import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module.js';
import { FilesModule } from './files/files.module.js';
import { PdfModule } from './pdf/pdf.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? './data/resomd.db',
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
