import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);

export function runGnd(args: string[]): never {
  const gndEntry = require.resolve('@graphprotocol/gnd/bin/gnd.js');
  const result = spawnSync(process.execPath, [gndEntry, ...args], { stdio: 'inherit' });
  if (result.error) {
    process.stderr.write(`Failed to launch gnd: ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
  process.exit(result.status ?? 1);
}
