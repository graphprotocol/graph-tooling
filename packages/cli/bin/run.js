#!/usr/bin/env node
import process from 'node:process';
import semver from 'semver';
import { execute } from '@oclif/core';
import { nodeVersion } from '../dist/version.js';

if (!semver.satisfies(process.version, nodeVersion)) {
  process.stderr.write(
    `Node.js version ${nodeVersion} is required. Current version: ${process.version}\n`,
  );
  process.exit(1);
}

await execute({ dir: import.meta.url });
