import { version } from './version';

export const GRAPH_CLI_SHARED_HEADERS = {
  'User-Agent': `@graphprotocol/graph-cli@${version}` as const,
};
