#!/usr/bin/env node
/**
 * ResoMD — kill processes on the project's ports.
 *
 * Resolves ports the same way the apps do:
 *  - API: reads PORT from apps/api/.env (default 3004)
 *  - Web: reads PORT from apps/web/.env (default 3003)
 *
 * Usage: pnpm kill-ports
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readEnvPort(envPath, fallback) {
  if (!existsSync(envPath)) return fallback;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^PORT\s*=\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return fallback;
}

const apiPort = readEnvPort(join(ROOT, 'apps', 'api', '.env'), '3004');
const webPort = readEnvPort(join(ROOT, 'apps', 'web', '.env'), '3003');

const ports = [
  { port: apiPort, label: 'ResoMD API' },
  { port: webPort, label: 'ResoMD Web' },
];

function killPort(port, label) {
  try {
    const output = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: 'utf-8',
    });
    const pids = output
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    if (pids.length === 0) {
      console.log(`  ${label} (:${port}) — free`);
      return;
    }

    for (const pid of pids) {
      try {
        process.kill(parseInt(pid, 10), 'SIGKILL');
        console.log(`  ${label} (:${port}) — killed PID ${pid}`);
      } catch {
        // EPERM or already dead
      }
    }
  } catch {
    console.log(`  ${label} (:${port}) — free`);
  }
}

console.log('\n  ResoMD — killing port processes\n');
for (const { port, label } of ports) {
  killPort(port, label);
}
console.log('');
