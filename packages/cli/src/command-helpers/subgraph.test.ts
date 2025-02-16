import { describe, expect, it } from 'vitest';
import { formatContractName, formatSubgraphName, getSubgraphBasename } from './subgraph';

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
