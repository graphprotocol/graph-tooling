import { print } from 'graphql';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export const NETWORK_SUBGRAPH_MAINNET =
  'https://gateway.thegraph.com/api/{api-key}/subgraphs/id/DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp';
export const NETWORK_SUBGRAPH_SEPOLIA =
  'https://gateway.thegraph.com/api/{api-key}/subgraphs/id/3xQHhMudr1oh69ut36G2mbzpYmYxwqCeU6wwqyCDCnqV';

export async function networkSubgraphExecute<T, V>(
  query: TypedDocumentNode<T, V>,
  variables: V,
  endpoint: string,
) {
  const response = await fetch(endpoint.replace('{api-key}', import.meta.env.VITE_STUDIO_API_KEY), {
    method: 'POST',
    body: JSON.stringify({
      query: print(query),
      variables,
    }),
  });
  const result = await response.json();
  return result.data as T;
}
