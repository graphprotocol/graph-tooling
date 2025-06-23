const DEFAULT_IPFS_URL = 'https://ipfs.thegraph.com/ipfs' as const;

/**
 * Validates supplied IPFS URL and provides warnings for deprecated/invalid URLs
 * @param ipfsUrl - The IPFS URL to validate, can be undefined
 * @returns An object with the validated URL and optional warning message
 */
export function getGraphIpfsUrl(ipfsUrl?: string): { ipfsUrl: string; warning?: string } {
  if (!ipfsUrl) {
    return { ipfsUrl: DEFAULT_IPFS_URL };
  }

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
        warning: `IPFS URL ${ipfsUrl} is deprecated. Using ${DEFAULT_IPFS_URL}`,
      };
    }

    return { ipfsUrl: ipfsUrl.replace(/\/+$/, '') };
  } catch (e) {
    return {
      ipfsUrl: DEFAULT_IPFS_URL,
      warning: `Invalid IPFS URL: ${ipfsUrl}. Using default URL: ${DEFAULT_IPFS_URL}`,
    };
  }
}
