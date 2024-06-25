import { print } from 'graphql';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export const NETWORK_SUBGRAPH_MAINNET =
  'https://api.thegraph.com/subgraphs/name/graphprotocol/graph-network-arbitrum';
export const NETWORK_SUBGRAPH_SEPOLIA =
  'https://api.thegraph.com/subgraphs/name/graphprotocol/graph-network-arbitrum-sepolia';

export async function networkSubgraphExecute<Result = unknown, Variables = unknown>(
  query: TypedDocumentNode<Result, Variables>,
  variables: Variables,
  {
    endpoint,
  }: {
    endpoint: string;
  },
): Promise<Result> {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: print(query),
      variables,
    }),
  });
  return (await response.json()).data;
}
