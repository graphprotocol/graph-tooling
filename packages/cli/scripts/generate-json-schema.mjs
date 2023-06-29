/* eslint-disable no-undef */
/* eslint-disable no-console */
// @ts-check
import { Manifest } from '../dist/manifest.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const schema = zodToJsonSchema(Manifest, {
    name: 'Subgraph Manifest',
  });

  console.log('Generating JSON schema for Subgraph Manifest');
  const path = join('..', '..', 'cf-pages');

  writeFileSync(join(path, 'subgraph-manifest-schema.json'), JSON.stringify(schema, null, 2));
  console.log('Generated JSON schema for Subgraph Manifest');
}

main().catch(console.error);
