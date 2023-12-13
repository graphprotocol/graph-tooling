import { filesystem } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import { createCompiler } from '../command-helpers/compiler';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { updateSubgraphNetwork } from '../command-helpers/network';
import debug from '../debug';
import Protocol from '../protocols';

const buildDebug = debug('graph-cli:build');

export default class BuildCommand extends Command {
  static description = 'Builds a subgraph and (optionally) uploads it to IPFS.';

  static args = {
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),

    ipfs: Flags.string({
      summary: 'Upload build results to an IPFS node.',
      char: 'i',
    }),
    'output-dir': Flags.directory({
      summary: 'Output directory for build results.',
      char: 'o',
      default: 'build/',
    }),
    'output-format': Flags.string({
      summary: 'Output format for mappings.',
      char: 't',
      options: ['wasm', 'wast'],
      default: 'wasm',
    }),
    'skip-migrations': Flags.boolean({
      summary: 'Skip subgraph migrations.',
    }),
    watch: Flags.boolean({
      summary: 'Regenerate types when subgraph files change.',
      char: 'w',
    }),
    network: Flags.string({
      summary: 'Network configuration to use from the networks config file.',
    }),
    // TODO: should be networksFile (with an "s"), or?
    'network-file': Flags.file({
      summary: 'Networks config file path.',
      default: 'networks.json',
    }),
  };

  async run() {
    const {
      args: { 'subgraph-manifest': manifest },
      flags: {
        ipfs,
        'output-dir': outputDir,
        'output-format': outputFormat,
        'skip-migrations': skipMigrations,
        watch,
        network,
        'network-file': networkFile,
      },
    } = await this.parse(BuildCommand);

    let protocol;
    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);
      protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    buildDebug('Detected protocol "%s" (%o)', protocol.name, protocol);

    if (network && filesystem.exists(networkFile) !== 'file') {
      this.error(`Network file '${networkFile}' does not exists or is not a file!`, { exit: 1 });
    }

    if (network) {
      const identifierName = protocol.getContract()!.identifierName();
      await updateSubgraphNetwork(manifest, network, networkFile, identifierName);
    }

    const compiler = createCompiler(manifest, {
      ipfs,
      outputDir,
      outputFormat,
      skipMigrations,
      protocol,
    });

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      this.exit(1);
      return;
    }

    // Watch subgraph files for changes or additions, trigger
    // compile (if watch argument specified)
    if (watch) {
      await compiler.watchAndCompile();
    } else {
      const result = await compiler.compile({ validate: true });
      if (result === false) {
        this.exit(1);
      }
    }
  }
}
