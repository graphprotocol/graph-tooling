import { Command } from '@oclif/core';
import { runGnd } from '../command-helpers/gnd.js';

export default class DevCommand extends Command {
  static description =
    'Run graph-node in dev mode. Delegates to `gnd dev`; run `graph dev --help` (without GRAPH_CLI_IGNORE_GND set) for the full list of supported flags.';

  static strict = false;

  static args = {};

  async run() {
    runGnd(['dev', ...this.argv]);
  }
}
