import { version } from './version.js';

export const GRAPH_CLI_SHARED_HEADERS = {
  'User-Agent': `@graphprotocol/graph-cli@${version}` as const,
};
