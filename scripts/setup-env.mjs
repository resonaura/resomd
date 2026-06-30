#!/usr/bin/env node
/**
 * resomd — interactive environment setup script.
 *
 * Generates .env files for all sub-services with secure defaults.
 * Admin passwords are bcrypt-hashed so a leaked .env is useless.
 *
 * Run: `pnpm setup`
 */

import { join } from 'node:path';
import {
  parseEnvFile,
  printDone,
  printHeader,
  promptPasswordOrGenerate,
  promptSecretOrGenerate,
  promptString,
  writeEnvFile,
} from './setup-utils.mjs';

const ROOT = import.meta.dirname;

/**
 * Read a value from a sibling project's .env file. Pulls shared values
 * (JWT_SECRET, AUTH_API_URL, etc.) from already-configured services instead
 * of re-prompting the user.
 */
async function readFromSibling(project, app, key) {
  const candidates = [
    join(ROOT, '..', '..', project, 'apps', app, '.env'),
    join(ROOT, '..', project, 'apps', app, '.env'),
  ];
  for (const p of candidates) {
    try {
      const { values } = await parseEnvFile(p);
      const v = values.get(key);
      if (v) return v;
    } catch {
      // file doesn't exist — try next
    }
  }
  return undefined;
}

async function setupApi() {
  printHeader('resomd API (port 3004)');
  const envPath = join(ROOT, '..', 'apps', 'api', '.env');
  const { values } = await parseEnvFile(envPath);

  const port = await promptString('Port', values.get('PORT') ?? '3004');
  const dbPath = await promptString(
    'Database path',
    values.get('DB_PATH') ?? './data/resomd.db'
  );

  // JWT secret — must match rsnra-auth. Pull from auth .env if available.
  const authJwt = await readFromSibling('rsnra-auth', 'api', 'JWT_SECRET');
  const jwtSecret = await promptSecretOrGenerate(
    'JWT secret (must match rsnra-auth)',
    values.get('JWT_SECRET') ?? authJwt
  );
  if (authJwt && authJwt === jwtSecret) {
    console.log('  ✓ Pulled JWT_SECRET from rsnra-auth .env');
  }

  const corsOrigins = await promptString(
    'CORS origins (comma-separated)',
    values.get('CORS_ORIGINS') ??
      'http://localhost:3003,http://localhost:2999,https://md.rsnra.com,https://auth.rsnra.com'
  );

  // AdminJS panel
  const adminUser = await promptString(
    'AdminJS panel email',
    values.get('ADMIN_USER') ?? 'admin@resomd.local'
  );

  const currentAdminPass = values.get('ADMIN_PASSWORD');

  const { plain: adminPlain, hash: adminHash } = await promptPasswordOrGenerate(
    'AdminJS panel password',
    currentAdminPass
  );

  if (adminPlain) {
    console.log(`  AdminJS email: ${adminUser}`);
    console.log(`  AdminJS password (save it!): ${adminPlain}\n`);
  }

  // AdminJS session secret — must be at least 32 chars
  const sessionSecret = await promptSecretOrGenerate(
    'AdminJS session secret (min 32 chars)',
    values.get('ADMIN_SESSION_SECRET'),
    48
  );

  // Pull AUTH_API_URL from auth .env if available
  const authPort = await readFromSibling('rsnra-auth', 'api', 'PORT');
  const authApiUrlDefault =
    values.get('AUTH_API_URL') ??
    (authPort ? `http://localhost:${authPort}` : 'http://localhost:2998');
  const authApiUrl = await promptString(
    'Auth service API URL',
    authApiUrlDefault
  );
  if (authPort) {
    console.log('  ✓ Pulled AUTH_API_URL from rsnra-auth .env');
  }

  const entries = [
    {
      key: 'NODE_ENV',
      value: values.get('NODE_ENV') ?? 'development',
      comment: 'Node environment',
    },
    { key: 'PORT', value: port, comment: 'API port' },
    { key: 'DB_PATH', value: dbPath, comment: 'SQLite database path' },
    {
      key: 'JWT_SECRET',
      value: jwtSecret,
      comment: 'JWT signing secret — must match rsnra-auth',
    },
    {
      key: 'CORS_ORIGINS',
      value: corsOrigins,
      comment: 'CORS allowed origins',
    },
    {
      key: 'ADMIN_USER',
      value: adminUser,
      comment: 'AdminJS panel login email',
    },
    {
      key: 'ADMIN_PASSWORD',
      value: adminHash,
      comment: 'AdminJS panel password — bcrypt hashed (cost 12)',
    },
    {
      key: 'ADMIN_SESSION_SECRET',
      value: sessionSecret,
      comment: 'AdminJS cookie session secret (min 32 chars)',
    },
    {
      key: 'AUTH_API_URL',
      value: authApiUrl,
      comment: 'Central auth service API URL',
    },
  ];

  await writeEnvFile(envPath, entries);
  printDone(envPath);
}

async function setupWeb() {
  printHeader('resomd Web (port 3003)');
  const envPath = join(ROOT, '..', 'apps', 'web', '.env');
  const { values } = await parseEnvFile(envPath);

  const apiUrl = await promptString(
    'resomd API URL',
    values.get('VITE_API_URL') ?? 'http://localhost:3004'
  );
  const pdfServerUrl = await promptString(
    'PDF server URL',
    values.get('VITE_PDF_SERVER_URL') ?? 'http://localhost:3004'
  );
  const authApiUrl = await promptString(
    'Auth API URL',
    values.get('VITE_AUTH_API_URL') ?? 'http://localhost:2998'
  );
  const authWebUrl = await promptString(
    'Auth web URL',
    values.get('VITE_AUTH_WEB_URL') ?? 'http://localhost:2999'
  );

  const entries = [
    {
      key: 'VITE_API_URL',
      value: apiUrl,
      comment: 'resomd API base URL',
    },
    {
      key: 'VITE_PDF_SERVER_URL',
      value: pdfServerUrl,
      comment: 'PDF export server URL (same as API)',
    },
    {
      key: 'VITE_AUTH_API_URL',
      value: authApiUrl,
      comment: 'Central auth service API URL',
    },
    {
      key: 'VITE_AUTH_WEB_URL',
      value: authWebUrl,
      comment: 'Central auth service web URL (login form)',
    },
  ];

  await writeEnvFile(envPath, entries);
  printDone(envPath);
}

async function main() {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║     resomd — Environment Setup       ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('  Press Enter to keep current values.\n');

  await setupApi();
  await setupWeb();

  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║        Setup complete! ✅            ║');
  console.log('  ╚══════════════════════════════════════╝\n');

  console.log('  Next steps:');
  console.log('    1. Make sure JWT_SECRET matches rsnra-auth');
  console.log('    2. Run `pnpm dev` to start the services\n');
}

main().catch(err => {
  console.error('\n  ✖ Setup failed:', err.message);
  process.exit(1);
});
