export const NETWORK_SUBGRAPH_MAINNET = 'https://gateway.thegraph.com/api/{api-key}/subgraphs/id/DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp';
export const NETWORK_SUBGRAPH_SEPOLIA = 'https://gateway.thegraph.com/api/{api-key}/subgraphs/id/3xQHhMudr1oh69ut36G2mbzpYmYxwqCeU6wwqyCDCnqV';

export async function networkSubgraphExecute(
  query: string,
  endpoint: string,
  apiKey: string,
) {
  const response = await fetch(endpoint.replace("{api-key}", apiKey), {
    method: 'POST',
    body: JSON.stringify({
      query,
    }),
  });
  return (await response.json()).data;
}
