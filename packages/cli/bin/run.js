#!/usr/bin/env node
import process from 'node:process';
import semver from 'semver';
import { execute } from '@oclif/core';
import { runGnd } from '../dist/command-helpers/gnd.js';
import { nodeVersion } from '../dist/version.js';

if (!semver.satisfies(process.version, nodeVersion)) {
  process.stderr.write(
    `Node.js version ${nodeVersion} is required. Current version: ${process.version}\n`,
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const useGnd = !process.env.GRAPH_CLI_IGNORE_GND && args[0] !== 'local';

if (useGnd) {
  runGnd(args);
} else {
  await execute({ dir: import.meta.url });
}
