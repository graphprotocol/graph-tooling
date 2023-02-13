/* eslint-disable */

import { unlinkCli } from './util';

export default async () => {
  delete process.env.GRAPH_CLI_TESTS;
  await unlinkCli();
};
