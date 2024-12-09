import { URL } from 'node:url';
import { print } from 'gluegun';

export const SUBGRAPH_STUDIO_URL = 'https://api.studio.thegraph.com/deploy/';

export const validateNodeUrl = (node: string) => new URL(node);

export const normalizeNodeUrl = (node: string) => new URL(node).toString();

export function chooseNodeUrl({ node }: { node?: string }) {
  if (node) {
    try {
      validateNodeUrl(node);
      return { node };
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`);
      process.exit(1);
    }
  }

  return { node: SUBGRAPH_STUDIO_URL };
}
