// eslint-disable-next-line no-restricted-imports
import { fetch } from '@whatwg-node/fetch';
import { GRAPH_CLI_SHARED_HEADERS } from './constants';

export default function fetchWrapper(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  return fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      ...GRAPH_CLI_SHARED_HEADERS,
    },
  });
}
