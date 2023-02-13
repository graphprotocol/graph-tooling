/* eslint-disable */

import { linkCli } from './util';

export default async () => {
  process.env.GRAPH_CLI_TESTS = '1';
  await linkCli();
};
