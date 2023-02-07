import { Command, Flags } from '@oclif/core';

export default class Add extends Command {
  static description = 'Adds a new datasource to a subgraph.';

  static flags = {
    abi: Flags.string({
      summary: 'Path to the contract ABI.',
      default: '*Download from Etherscan*',
    }),
    contractName: Flags.string({
      summary: 'Name of the contract.',
      default: 'Contract',
    }),
    mergeEntities: Flags.boolean({
      summary: 'Whether to merge entities with the same name.',
      default: false,
    }),
    networkFile: Flags.string({
      summary: 'Networks config file path.',
      default: 'networks.json',
    }),
  };

  async run() {
    const { flags } = await this.parse(Add);

    this.log('running my command', { flags });
  }
}
