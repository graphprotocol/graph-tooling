import { describe, expect, it } from 'vitest';
import { appendApiVersionForGraph } from './compiler';

describe.concurrent('appendApiVersionForGraph', () => {
  it('append /api/v0 to Prod URL with trailing slash', () => {
    expect(appendApiVersionForGraph('https://api.thegraph.com/ipfs/')).toBe(
      'https://api.thegraph.com/ipfs/api/v0',
    );
  });

  it('append /api/v0 to Prod URL without trailing slash', () => {
    expect(appendApiVersionForGraph('https://api.thegraph.com/ipfs')).toBe(
      'https://api.thegraph.com/ipfs/api/v0',
    );
  });

  it('append /api/v0 to Staging URL without trailing slash', () => {
    expect(appendApiVersionForGraph('https://staging.api.thegraph.com/ipfs')).toBe(
      'https://staging.api.thegraph.com/ipfs/api/v0',
    );
  });

  it('do nothing if Prod URL has /api/v0', () => {
    expect(appendApiVersionForGraph('https://api.thegraph.com/ipfs/api/v0')).toBe(
      'https://api.thegraph.com/ipfs/api/v0',
    );
  });

  it('do nothing if Prod URL has no /ipfs', () => {
    expect(appendApiVersionForGraph('https://api.thegraph.com')).toBe('https://api.thegraph.com');
  });

  it('do nothing for non-graph endpoint', () => {
    expect(appendApiVersionForGraph('https://ipfs.saihaj.dev/')).toBe('https://ipfs.saihaj.dev/');
  });

  it('do nothing for non-graph endpoint ending with /ipfs', () => {
    expect(appendApiVersionForGraph('https://ipfs.saihaj.dev/ipfs/')).toBe(
      'https://ipfs.saihaj.dev/ipfs/',
    );
  });
});
