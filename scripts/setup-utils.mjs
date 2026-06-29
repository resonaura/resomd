/**
 * Shared setup-script utilities — used by setup-env.mjs in all rsnra projects.
 *
 * Provides helpers for:
 *  - Interactive prompts with default-value preservation (press Enter to keep)
 *  - Secure random generation (JWT secrets, OAuth secrets, session secrets)
 *  - Bcrypt password hashing (so .env leaks are useless without the project)
 *  - .env file parsing and writing
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  password as passwordPrompt,
  input as inputPrompt,
  confirm as confirmPrompt,
  select as selectPrompt,
} from '@inquirer/prompts';

// ── Random generators ───────────────────────────────────────────────

/** Generate a cryptographically secure random hex string of `bytes` bytes. */
export function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

/** Generate a memorable random password. */
export function generatePassword(length = 20) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** Hash a password with bcrypt (cost 12 — same as the APIs use). */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// ── .env file helpers ───────────────────────────────────────────────

/**
 * Parse a .env file into a Map of key→value, preserving comments and order.
 * Returns { values: Map, lines: string[] } where lines preserves the raw
 * file content for selective rewriting.
 */
export async function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { values: new Map(), lines: [] };
  }
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const values = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    values.set(key, value);
  }

  return { values, lines };
}

/**
 * Write a .env file. Takes an ordered array of entries.
 *
 * @param filePath - output path
 * @param entries - ordered array of { key, value, comment? }
 */
export async function writeEnvFile(filePath, entries) {
  const lines = [];

  for (const entry of entries) {
    if (entry.comment) {
      for (const c of entry.comment.split('\n')) {
        lines.push(`# ${c}`);
      }
    }
    lines.push(`${entry.key}=${entry.value ?? ''}`);
    lines.push(''); // blank line between entries
  }

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
}

// ── Prompt helpers ──────────────────────────────────────────────────

/**
 * Prompt for a string value with a default. Press Enter to keep current.
 */
export async function promptString(message, defaultValue, opts = {}) {
  if (opts.secret) {
    const value = await passwordPrompt({
      message: `${message}${defaultValue ? ' (Enter to keep current)' : ''}:`,
      mask: '*',
    });
    if (!value && defaultValue) return defaultValue;
    if (opts.validate) {
      const result = opts.validate(value);
      if (result !== true) throw new Error(result);
    }
    return value;
  }

  const value = await inputPrompt({
    message,
    default: defaultValue ?? undefined,
    validate: opts.validate ?? undefined,
  });
  return value;
}

/**
 * Prompt for a yes/no confirmation.
 */
export async function promptConfirm(message, defaultValue = false) {
  return confirmPrompt({
    message,
    default: defaultValue,
  });
}

/**
 * Prompt to select from a list.
 */
export async function promptSelect(message, choices) {
  return selectPrompt({ message, choices });
}

/**
 * Offer to generate a secret or enter one manually.
 *
 * @param label - what this secret is for (e.g., "JWT secret")
 * @param currentValue - existing value if any
 * @param bytes - length of generated secret in bytes
 * @returns the secret value
 */
export async function promptSecretOrGenerate(label, currentValue, bytes = 32) {
  const choices = [
    { name: `Generate a new ${label}`, value: 'generate' },
    { name: 'Enter manually', value: 'manual' },
  ];
  if (currentValue) {
    choices.unshift({ name: `Keep current value`, value: 'keep' });
  }

  const choice = await promptSelect(`${label}:`, choices);

  if (choice === 'keep') return currentValue;
  if (choice === 'generate') {
    const secret = generateSecret(bytes);
    console.log(
      `  Generated: ${secret.slice(0, 8)}...${secret.slice(-4)} (${secret.length} chars)`
    );
    return secret;
  }

  // manual
  return promptString(`Enter ${label}`, '', {
    validate: v => v.length >= 16 || `Must be at least 16 characters`,
  });
}

/**
 * Offer to generate a password or enter one manually.
 * Returns { plain, hash } where plain is shown once and hash goes in .env.
 *
 * @param label - what this password is for
 * @param currentValue - existing hash if any
 */
export async function promptPasswordOrGenerate(label, currentValue) {
  const choices = [
    { name: 'Generate a strong password', value: 'generate' },
    { name: 'Enter manually', value: 'manual' },
  ];
  if (currentValue) {
    choices.unshift({
      name: 'Keep current (already hashed)',
      value: 'keep',
    });
  }

  const choice = await promptSelect(`${label}:`, choices);

  if (choice === 'keep') {
    return { plain: null, hash: currentValue };
  }

  let plain;
  if (choice === 'generate') {
    plain = generatePassword(20);
    console.log(
      `\n  ┌──────────────────────────────────────────────────────────┐`
    );
    console.log(`  │  Generated password: ${plain}`);
    console.log(
      `  │  Save this — it won't be shown again!                    │`
    );
    console.log(
      `  └──────────────────────────────────────────────────────────┘\n`
    );
  } else {
    plain = await passwordPrompt({
      message: `Enter ${label}:`,
      mask: '*',
      validate: v => v.length >= 8 || 'Must be at least 8 characters',
    });
  }

  const hash = await hashPassword(plain);
  console.log(`  Hashed with bcrypt (cost 12): ${hash.slice(0, 20)}...`);
  return { plain, hash };
}

// ── Section header ──────────────────────────────────────────────────

export function printHeader(title) {
  const line = '═'.repeat(Math.max(title.length + 4, 50));
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

export function printDone(filePath) {
  console.log(`\n  ✓ Written to ${filePath}\n`);
}
