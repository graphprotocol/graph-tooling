const DEFAULT_IPFS_URL = 'https://ipfs.thegraph.com/ipfs/api/v0' as const;

/**
 * Validates supplied IPFS URL and provides warnings for deprecated/invalid URLs
 * @param ipfsUrl - The IPFS URL to validate, can be undefined
 * @returns An object with the validated URL and optional warning message
 */
export function getGraphIpfsUrl(ipfsUrl?: string): { ipfsUrl: string; warning?: string } {
  if (!ipfsUrl) {
    return { ipfsUrl: DEFAULT_IPFS_URL };
  }

  // trim trailing slash
  ipfsUrl = ipfsUrl.replace(/\/+$/, '');

  try {
    new URL(ipfsUrl);

    const deprecatedPatterns = [
      /^https?:\/\/ipfs\.testnet\.thegraph\.com.*/,
      /^https?:\/\/ipfs\.network\.thegraph\.com.*/,
      /^https?:\/\/api\.thegraph\.com\/ipfs.*/,
    ];

    const isDeprecated = deprecatedPatterns.some(pattern => pattern.test(ipfsUrl));
    if (isDeprecated) {
      return {
        ipfsUrl: DEFAULT_IPFS_URL,
        warning: `IPFS URL ${ipfsUrl} is deprecated. Using default URL instead: ${DEFAULT_IPFS_URL}`,
      };
    }

    // if default URL - make sure it ends with /api/v0
    if (DEFAULT_IPFS_URL.startsWith(ipfsUrl)) {
      return {
        ipfsUrl: DEFAULT_IPFS_URL,
      };
    }

    return { ipfsUrl };
  } catch (e) {
    return {
      ipfsUrl: DEFAULT_IPFS_URL,
      warning: `Invalid IPFS URL: ${ipfsUrl}. Using default URL instead: ${DEFAULT_IPFS_URL}`,
    };
  }
}
