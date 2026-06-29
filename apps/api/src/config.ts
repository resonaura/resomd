import { z, ZodError } from 'zod';
import dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

dotenv.config();

const logger = new Logger('Config');

/* ─────────────────────────────────────────────
   Environment Schema (Zod)
───────────────────────────────────────────── */
export const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Application
  PORT: z.string().default('3004'),
  DB_PATH: z.string().default('./data/resomd.db'),

  // Security
  JWT_SECRET: z.string().min(16, 'JWT_SECRET is required (min 16 chars)'),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3003,http://localhost:2999,https://md.rsnra.com,https://auth.rsnra.com'
    ),

  // Admin bootstrap
  ADMIN_USER: z.string().default('admin@resomd.local'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(32, 'ADMIN_SESSION_SECRET must be at least 32 chars'),

  // Central auth service (rsnra-auth) URL
  AUTH_API_URL: z.string().default('http://localhost:2998'),
});

export type EnvVars = z.infer<typeof envSchema>;

/* ─────────────────────────────────────────────
   Validate Environment Variables
───────────────────────────────────────────── */
let validatedEnv: EnvVars;

try {
  validatedEnv = envSchema.parse(process.env);
  logger.log('✅ Environment variables validated successfully');
} catch (error) {
  if (error instanceof ZodError) {
    logger.error('❌ Invalid environment variables:');
    error.issues.forEach(err => {
      logger.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    logger.error('❌ Environment validation failed with unknown error', error);
  }
  throw new Error('Environment validation failed', { cause: error });
}

export const config = validatedEnv;

/* ─────────────────────────────────────────────
   Validation helper for NestJS ConfigModule
───────────────────────────────────────────── */
export const validateEnv = () => config;
