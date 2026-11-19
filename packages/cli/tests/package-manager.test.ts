import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { system } from 'gluegun';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPackageManagerCommands } from '../src/command-helpers/package-manager.js';

describe('package manager selection', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-package-manager-'));
    vi.spyOn(system, 'which').mockImplementation(command => `/bin/${command}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function configure(packageManager: string, root = directory) {
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager }));
  }

  it('uses pnpm from a parent workspace instead of an available yarn', () => {
    configure('pnpm@9.15.0');
    const project = path.join(directory, 'packages', 'subgraph');
    configure('', path.dirname(project));

    expect(getPackageManagerCommands(project)).toEqual({
      link: 'pnpm link --global @graphprotocol/graph-cli',
      install: 'pnpm install',
      codegen: 'pnpm run codegen',
      deploy: 'pnpm run deploy',
    });
  });

  it('honors an npm declaration even when yarn is installed', () => {
    configure('npm@10.0.0');
    expect(getPackageManagerCommands(directory).install).toBe('npm install');
  });

  it('honors the nearest declaration', () => {
    configure('pnpm@9.15.0');
    const project = path.join(directory, 'project');
    configure('yarn@4.0.0', project);
    expect(getPackageManagerCommands(project).install).toBe('yarn');
  });

  it('does not silently fall back when the declared manager is missing', () => {
    configure('pnpm@9.15.0');
    vi.mocked(system.which).mockImplementation(command =>
      command === 'pnpm' ? null : `/bin/${command}`,
    );
    expect(() => getPackageManagerCommands(directory)).toThrow(/pnpm.*not found/i);
  });

  it('keeps the existing yarn preference without a declaration', () => {
    expect(getPackageManagerCommands(directory).install).toBe('yarn');
  });

  it('keeps the existing fallback for other package managers', () => {
    configure('bun@1.0.0');
    expect(getPackageManagerCommands(directory).install).toBe('yarn');
  });

  it('falls back to npm without yarn', () => {
    vi.mocked(system.which).mockImplementation(command => (command === 'npm' ? '/bin/npm' : null));
    expect(getPackageManagerCommands(directory).install).toBe('npm install');
  });

  it('supports a pnpm-only installation', () => {
    vi.mocked(system.which).mockImplementation(command =>
      command === 'pnpm' ? '/bin/pnpm' : null,
    );
    expect(getPackageManagerCommands(directory).install).toBe('pnpm install');
  });

  it('does not interpret packageManager content as a shell command', () => {
    configure('pnpm@9.15.0; echo unsafe');
    expect(getPackageManagerCommands(directory).install).toBe('pnpm install');
  });
});
