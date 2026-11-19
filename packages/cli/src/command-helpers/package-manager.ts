import fs from 'node:fs';
import path from 'node:path';
import { system } from 'gluegun';

type PackageManager = 'yarn' | 'npm' | 'pnpm';

function findConfiguredPackageManager(directory: string): PackageManager | undefined {
  let current = path.resolve(directory);

  while (true) {
    const manifest = path.join(current, 'package.json');
    if (fs.existsSync(manifest)) {
      const { packageManager } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (packageManager) {
        return /^(yarn|npm|pnpm)@/.exec(packageManager)?.[1] as PackageManager | undefined;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
}

export function getPackageManagerCommands(directory: string) {
  let manager = findConfiguredPackageManager(directory);
  if (manager) {
    if (!system.which(manager)) {
      throw new Error(
        `${manager} was not found on your system. Please install it so it is in $PATH.`,
      );
    }
  } else {
    manager = (['yarn', 'npm', 'pnpm'] as const).find(candidate => system.which(candidate));
    if (!manager) {
      throw new Error(
        'Neither Yarn, NPM nor pnpm were found on your system. Please install one of them.',
      );
    }
  }

  return {
    link: `${manager} link ${manager === 'pnpm' ? '--global ' : ''}@graphprotocol/graph-cli`,
    install: manager === 'yarn' ? 'yarn' : `${manager} install`,
    codegen: manager === 'yarn' ? 'yarn codegen' : `${manager} run codegen`,
    deploy: manager === 'yarn' ? 'yarn deploy' : `${manager} run deploy`,
  };
}
