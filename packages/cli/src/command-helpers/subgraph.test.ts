import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatContractName,
  formatSubgraphName,
  getSubgraphBasename,
  validateSubgraphDirectory,
} from './subgraph';

describe('getSubgraphBasename', () => {
  it('returns the last segment of a subgraph name', () => {
    expect(getSubgraphBasename('user/my-subgraph')).toBe('my-subgraph');
    expect(getSubgraphBasename('org/project')).toBe('project');
  });

  it('returns the full name if no slash is present', () => {
    expect(getSubgraphBasename('single-name')).toBe('single-name');
  });
});

describe('formatSubgraphName', () => {
  it('converts to lowercase', () => {
    expect(formatSubgraphName('MySubGraph')).toBe('mysubgraph');
  });

  it('replaces spaces with hyphens', () => {
    expect(formatSubgraphName('my subgraph name')).toBe('my-subgraph-name');
    expect(formatSubgraphName('multiple   spaces')).toBe('multiple-spaces');
  });

  it('removes special characters', () => {
    expect(formatSubgraphName('my$special@subgraph!')).toBe('myspecialsubgraph');
  });

  it('keeps alphanumeric characters, hyphens and underscores', () => {
    expect(formatSubgraphName('my-subgraph_123')).toBe('my-subgraph_123');
  });
});

describe('formatContractName', () => {
  it('replaces spaces and dots with underscores', () => {
    expect(formatContractName('My Contract')).toBe('My_Contract');
    expect(formatContractName('contract.name')).toBe('contract_name');
    expect(formatContractName('multiple...dots')).toBe('multiple_dots');
  });

  it('removes special characters but keeps alphanumeric, hyphens and underscores', () => {
    expect(formatContractName('Contract$$$Name')).toBe('ContractName');
    expect(formatContractName('My-Contract_123')).toBe('My-Contract_123');
    expect(formatContractName('My Contract $$$$')).toBe('My_Contract_');
  });

  it('preserves case', () => {
    expect(formatContractName('MyContractName')).toBe('MyContractName');
  });
});

describe('validateSubgraphDirectory', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-init-'));
  });
  afterEach(async () => {
    await fs.remove(dir);
  });

  it('rejects an empty directory', () => {
    expect(validateSubgraphDirectory('')).toBe('Directory must not be empty');
  });
  it('rejects an existing directory at the directory prompt', () => {
    expect(validateSubgraphDirectory(dir)).toContain('Directory already exists');
  });
  it('rejects an existing regular file', async () => {
    const file = path.join(dir, 'file');
    await fs.writeFile(file, 'keep this content');
    expect(validateSubgraphDirectory(file)).toContain('Directory already exists');
    expect(await fs.readFile(file, 'utf8')).toBe('keep this content');
  });
  it('accepts a new directory', () => {
    expect(validateSubgraphDirectory(path.join(dir, 'new'))).toBe(true);
  });
  it('accepts nested directories that have not been created yet', () => {
    expect(validateSubgraphDirectory(path.join(dir, 'new', 'nested'))).toBe(true);
  });
});
