import path from 'path';
import { describe, expect, it } from 'vitest';
import { getSpkgFilePath, isSpkgUrl } from '../../src/command-helpers/spkg';

describe('getSpkgFilePath', () => {
  it('should return the correct file path', () => {
    const spkgUrl = 'https://example.com/package.spkg';
    const directory = '/home/testuser/development/testgraph';
    const expectedFilePath = path.join(directory, 'package.spkg');

    const filePath = getSpkgFilePath(spkgUrl, directory);

    expect(filePath).to.equal(expectedFilePath);
  });

  it('should throw an error for invalid spkg url', () => {
    const spkgUrl = '';
    const directory = '/home/joshua/development/graphprotocol/graph-tooling/packages/cli';

    expect(() => getSpkgFilePath(spkgUrl, directory)).to.throw('Invalid spkg url');
  });
});

describe('isSpkgUrl', () => {
  it('should return true for valid spkg url with https', () => {
    const spkgUrl = 'https://spkg.io/streamingfast/package.spkg';
    const result = isSpkgUrl(spkgUrl);
    expect(result).toBe(true);
  });

  it('should return true for valid spkg url', () => {
    const spkgUrl = 'spkg.io/streamingfast/package.spkg';
    const result = isSpkgUrl(spkgUrl);
    expect(result).toBe(true);
  });

  it('should return false for invalid spkg url', () => {
    const spkgUrl = 'https://example.com/package.spkg';
    const result = isSpkgUrl(spkgUrl);
    expect(result).toBe(false);
  });
  it('should return false for non-url string', () => {
    const spkgUrl = 'streamingfast/package.spkg';
    const result = isSpkgUrl(spkgUrl);
    expect(result).toBe(false);
  });
});
