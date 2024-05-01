import { URL } from 'url';
import { print } from 'gluegun';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';

export const SUBGRAPH_STUDIO_URL = 'https://api.studio.thegraph.com/deploy/';
const HOSTED_SERVICE_URL = 'https://api.thegraph.com/deploy/';
const HOSTED_SERVICE_INDEX_NODE_URL = 'https://api.thegraph.com/index-node/graphql';

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

export async function getHostedServiceSubgraphId({
  subgraphName,
}: {
  subgraphName: string;
}): Promise<{
  subgraph: string;
  synced: boolean;
  health: 'healthy' | 'unhealthy' | 'failed';
}> {
  const response = await fetch(HOSTED_SERVICE_INDEX_NODE_URL, {
    method: 'POST',
    body: JSON.stringify({
      query: /* GraphQL */ `
        query GraphCli_getSubgraphId($subgraphName: String!) {
          indexingStatusForCurrentVersion(subgraphName: $subgraphName) {
            subgraph
            synced
            health
          }
        }
      `,
      variables: {
        subgraphName,
      },
    }),
    headers: {
      'content-type': 'application/json',
      ...GRAPH_CLI_SHARED_HEADERS,
    },
  });

  const { data, errors } = await response.json();

  if (errors) {
    throw new Error(errors[0].message);
  }

  if (!data.indexingStatusForCurrentVersion) {
    throw new Error(`Subgraph "${subgraphName}" not found on the hosted service`);
  }

  return data.indexingStatusForCurrentVersion;
}
