import { describe, expect, it } from 'vitest';
import { getGraphIpfsUrl } from './ipfs.js';

const DEFAULT_IPFS_URL = 'https://ipfs.thegraph.com/ipfs/api/v0';

describe('getGraphIpfsUrl', { concurrent: true }, () => {
  it('returns default URL when input is undefined', () => {
    expect(getGraphIpfsUrl(undefined)).toEqual({
      ipfsUrl: DEFAULT_IPFS_URL,
    });
  });

  it('returns default URL when input is empty string', () => {
    expect(getGraphIpfsUrl('')).toEqual({
      ipfsUrl: DEFAULT_IPFS_URL,
    });
  });

  it('returns input URL when valid and not deprecated', () => {
    const validUrl = 'https://ipfs.network.example.com';
    expect(getGraphIpfsUrl(validUrl)).toEqual({
      ipfsUrl: validUrl,
    });
  });

  it('trim trailing slash from valid url', () => {
    const validUrl = 'https://ipfs.network.example.com/ipfs/';
    expect(getGraphIpfsUrl(validUrl)).toEqual({
      ipfsUrl: 'https://ipfs.network.example.com/ipfs',
    });
  });

  it('returns default URL with warning for deprecated api.thegraph.com URL', () => {
    const result = getGraphIpfsUrl('https://api.thegraph.com/ipfs/api/v0');
    expect(result.ipfsUrl).toEqual(DEFAULT_IPFS_URL);
    expect(result.warning).toContain('deprecated');
  });

  it('returns default URL with warning for deprecated ipfs.testnet.thegraph.com URL', () => {
    const result = getGraphIpfsUrl('https://ipfs.testnet.thegraph.com/abc');
    expect(result.ipfsUrl).toEqual(DEFAULT_IPFS_URL);
    expect(result.warning).toContain('deprecated');
  });

  it('returns default URL with warning for deprecated ipfs.network.thegraph.com URL', () => {
    const result = getGraphIpfsUrl('https://ipfs.network.thegraph.com/xyz');
    expect(result.ipfsUrl).toEqual(DEFAULT_IPFS_URL);
    expect(result.warning).toContain('deprecated');
  });

  it('returns default URL with warning for invalid URL', () => {
    const result = getGraphIpfsUrl('not-a-valid-url');
    expect(result.ipfsUrl).toEqual(DEFAULT_IPFS_URL);
    expect(result.warning).toContain('Invalid IPFS URL');
  });

  it('preserves non-deprecated graph endpoints', () => {
    const url = 'https://ipfs.thegraph.com/ipfs';
    expect(getGraphIpfsUrl(url)).toEqual({
      ipfsUrl: DEFAULT_IPFS_URL,
    });
  });

  it('preserves third-party IPFS endpoints', () => {
    const url = 'https://ipfs.example.com/api';
    expect(getGraphIpfsUrl(url)).toEqual({
      ipfsUrl: url,
    });
  });
});
