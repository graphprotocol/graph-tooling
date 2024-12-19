#!/usr/bin/env node
import semver from 'semver';
import { execute } from '@oclif/core';
import { nodeVersion } from '../dist/version.js';

if (!semver.satisfies(process.version, nodeVersion)) {
  console.error(`Node.js version ${nodeVersion} is required. Current version: ${process.version}`);
  process.exit(1);
}

await execute({ dir: import.meta.url });
