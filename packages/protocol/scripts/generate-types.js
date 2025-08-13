#!/usr/bin/env node

/**
 * Generate TypeScript types from JSON Schema definitions using json-schema-to-typescript
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compile } from 'json-schema-to-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMAS_DIR = path.join(__dirname, '../schemas');
const OUTPUT_DIR = path.join(__dirname, '../src/types');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'schema-types.generated.ts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔧 Generating TypeScript types from JSON schemas (single pass)...');

try {
  const load = (filename) => JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, filename), 'utf8'));

  // Read existing index.schema.json to avoid duplication and hardcoding
  const indexOnDiskPath = path.join(SCHEMAS_DIR, 'index.schema.json');
  const indexOnDisk = JSON.parse(fs.readFileSync(indexOnDiskPath, 'utf8'));
  const defs = indexOnDisk.$defs ?? {};

  // Build mapping from referenced file -> local #/$defs/<Key>
  const refMap = new Map();
  for (const [defKey, defValue] of Object.entries(defs)) {
    if (defValue && typeof defValue === 'object' && typeof defValue.$ref === 'string') {
      const ref = defValue.$ref.replace(/^\.\//, '');
      refMap.set(ref, `#/$defs/${defKey}`);
      refMap.set(`./${ref}`, `#/$defs/${defKey}`);
    }
  }

  // Load each referenced schema file and rewrite their inner $ref to local $defs
  const schemas = {};
  const rewriteRefs = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string' && refMap.has(node.$ref)) {
      const mapped = refMap.get(node.$ref);
      node.$ref = mapped;
      const keys = Object.keys(node);
      if (keys.length > 1) {
        for (const k of keys) {
          if (k !== '$ref') delete node[k];
        }
      }
    }
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === 'object') rewriteRefs(value);
    }
  };

  for (const [defKey, defValue] of Object.entries(defs)) {
    if (defValue && typeof defValue === 'object' && typeof defValue.$ref === 'string') {
      const ref = defValue.$ref.replace(/^\.\//, '');
      const schemaObj = load(ref);
      rewriteRefs(schemaObj);
      schemas[defKey] = schemaObj;
    }
  }

  // Build derived index schema that references all defs to ensure reachability
  const indexSchema = {
    $id: indexOnDisk.$id ?? 'index.schema.json',
    $schema: indexOnDisk.$schema ?? 'http://json-schema.org/draft-07/schema#',
    title: indexOnDisk.title ?? 'SchemasIndex',
    type: 'object',
    properties: Object.fromEntries(
      Object.keys(schemas).map((key) => [key, { $ref: `#/$defs/${key}` }])
    ),
    additionalProperties: false,
    $defs: schemas,
  };

  const customName = (_schema, keyFromDefs) => keyFromDefs;

  const typescript = await compile(indexSchema, 'SchemasIndex', {
    cwd: SCHEMAS_DIR,
    bannerComment: `/* Generated from JSON Schemas in schemas/ — do not edit */`,
    style: { singleQuote: true, semi: true },
    declareExternallyReferenced: true,
    customName,
  });

  fs.writeFileSync(OUTPUT_FILE, typescript);
  console.log(`✅ Written: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
} catch (error) {
  console.error('❌ Type generation failed:', error);
  process.exit(1);
}