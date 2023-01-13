/* eslint-disable */

import { npmLinkCli } from './util';

export default async () => {
  process.env.GRAPH_CLI_TESTS = '1';
  await npmLinkCli();
};
