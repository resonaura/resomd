import { writeFile } from 'node:fs/promises';
import { ZodType, ZodDefault, ZodOptional, ZodEnum, ZodRawShape } from 'zod';
import { envSchema } from './config.js';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvExampleGenerator');

// Fixed type to match ZodEnum definition
type EnumValues = [string, ...string[]];

function isZodDefault(schema: ZodType): schema is ZodDefault<ZodType> {
  return schema instanceof ZodDefault;
}

function isZodOptional(schema: ZodType): schema is ZodOptional<ZodType> {
  return schema instanceof ZodOptional;
}

function isZodEnum(schema: ZodType): schema is ZodEnum<any> {
  return schema instanceof ZodEnum;
}

function unwrapType(schema: ZodType): {
  inner: ZodType;
  optional: boolean;
  defaultValue?: string;
  enumValues?: EnumValues;
} {
  let current: ZodType = schema;
  let optional = false;
  let defaultValue: string | undefined;
  let enumValues: EnumValues | undefined;

  if (isZodDefault(current)) {
    optional = true; // Fields with defaults are effectively optional in .env
    const def = current._def;
    if (typeof def.defaultValue === 'function') {
      const rawDefault = (def.defaultValue as () => unknown)();
      if (rawDefault !== undefined) {
        if (
          typeof rawDefault === 'object' &&
          rawDefault !== null &&
          typeof rawDefault !== 'function'
        ) {
          defaultValue = JSON.stringify(rawDefault);
        } else if (
          typeof rawDefault === 'string' ||
          typeof rawDefault === 'number' ||
          typeof rawDefault === 'boolean'
        ) {
          defaultValue = String(rawDefault);
        }
      }
    }
    if ('innerType' in def && def.innerType) {
      current = def.innerType;
    }
  }

  if (isZodOptional(current)) {
    optional = true;
    current = current.unwrap();
  }

  if (
    isZodEnum(current) &&
    Array.isArray(current.options) &&
    current.options.length > 0
  ) {
    enumValues = current.options as unknown as EnumValues;
  }

  return { inner: current, optional, defaultValue, enumValues };
}

export async function generateEnvExample(path = '.env.example') {
  const shape = envSchema.shape as ZodRawShape;

  const required: string[] = [];
  const optional: string[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    const {
      optional: isOptional,
      defaultValue,
      enumValues,
    } = unwrapType(schema as unknown as ZodType);

    const lines: string[] = [];

    if (enumValues) {
      lines.push(`# 🔘 one of: ${enumValues.join(', ')}`);
    }

    lines.push(`${key}=${defaultValue ?? 'xxxxx'}`);

    const target = isOptional ? optional : required;
    target.push(lines.join('\n'));
  }

  const sections: string[] = [];

  if (required.length > 0) {
    sections.push('## 📌 Required environment variables', ...required, '');
  }

  if (optional.length > 0) {
    sections.push('## 💡 Optional environment variables', ...optional, '');
  }

  const output = sections.join('\n');

  await writeFile(path, output);
  logger.log(`.env.example generated successfully at ${path}`);
}
