import { URL } from 'url';
import { print } from 'gluegun';

const SUBGRAPH_STUDIO_URL = 'https://api.studio.thegraph.com/deploy/';
const HOSTED_SERVICE_URL = 'https://api.thegraph.com/deploy/';

export const validateNodeUrl = (node: string) => new URL(node);

export const normalizeNodeUrl = (node: string) => new URL(node).toString();

export function chooseNodeUrl({
  product,
  studio,
  node,
  allowSimpleName,
}: {
  product: string | undefined;
  studio: boolean | undefined;
  node?: string;
  allowSimpleName?: boolean;
}) {
  if (node) {
    try {
      validateNodeUrl(node);
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`);
      process.exit(1);
    }
  } else {
    if (studio) {
      product = 'subgraph-studio';
    }
    switch (product) {
      case 'subgraph-studio':
        node = SUBGRAPH_STUDIO_URL;
        break;
      case 'hosted-service':
        node = HOSTED_SERVICE_URL;
        break;
    }
  }
  if (node?.match(/studio/) || product === 'subgraph-studio') {
    allowSimpleName = true;
  }
  return { node, allowSimpleName };
}
