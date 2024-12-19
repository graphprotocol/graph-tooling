#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import { execute } from '@oclif/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const requiredVersion = pkg.engines.node;
const currentVersion = process.version;

if (!semver.satisfies(currentVersion, requiredVersion)) {
  console.error(
    `Error: Node.js version ${requiredVersion} is required. Current version: ${currentVersion}`,
  );
  process.exit(1);
}

await execute({ dir: import.meta.url });
