/* eslint-disable */

import { linkCli } from './link';

export default async () => {
  process.env.GRAPH_CLI_TESTS = '1';
  await linkCli();
};
