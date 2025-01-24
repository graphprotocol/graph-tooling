#!/usr/bin/env node
import process from 'node:process';
import semver from 'semver';
import { flush, handle, run } from '@oclif/core';
import { nodeVersion } from '../dist/version.js';

if (!semver.satisfies(process.version, nodeVersion)) {
  process.stderr.write(
    `Node.js version ${nodeVersion} is required. Current version: ${process.version}\n`,
  );
  process.exit(1);
}

await run(process.argv.slice(2), import.meta.url)
  .catch(async error => handle(error))
  .finally(async () => flush());
