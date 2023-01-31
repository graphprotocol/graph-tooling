/* eslint-disable */
import { npmUnlinkCli } from './util';

export default async () => {
  delete process.env.GRAPH_CLI_TESTS;
  await npmUnlinkCli();
};
