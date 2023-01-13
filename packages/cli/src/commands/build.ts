import chalk from 'chalk';
import { GluegunToolbox } from 'gluegun';
import { createCompiler } from '../command-helpers/compiler';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { fixParameters } from '../command-helpers/gluegun';
import { updateSubgraphNetwork } from '../command-helpers/network';
import debug from '../debug';
import Protocol from '../protocols';

const buildDebug = debug('graph-cli:build');

const HELP = `
${chalk.bold('graph build')} [options] ${chalk.bold('[<subgraph-manifest>]')}

Options:

  -h, --help                    Show usage information
  -i, --ipfs <node>             Upload build results to an IPFS node
  -o, --output-dir <path>       Output directory for build results (default: build/)
  -t, --output-format <format>  Output format for mappings (wasm, wast) (default: wasm)
      --skip-migrations         Skip subgraph migrations (default: false)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
      --network <name>          Network configuration to use from the networks config file
      --network-file <path>     Networks config file path (default: "./networks.json")
`;

export interface BuildOptions {
  help?: boolean;
  ipfs?: string;
  outputDir?: string;
  outputFormat?: string;
  skipMigrations?: boolean;
  watch?: boolean;
  network?: string;
  networkFile?: string;
}

export default {
  description: 'Builds a subgraph and (optionally) uploads it to IPFS',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { filesystem, print } = toolbox;

    // Parse CLI parameters
    let {
      i,
      h,
      help,
      ipfs,
      o,
      outputDir,
      outputFormat,
      skipMigrations,
      t,
      w,
      watch,
      network,
      networkFile,
    } = toolbox.parameters.options;

    // Support both short and long option variants
    help ||= h;
    ipfs ||= i;
    outputDir ||= o;
    outputFormat ||= t;
    watch ||= w;

    let manifest;
    try {
      [manifest] = fixParameters(toolbox.parameters, {
        h,
        help,
        w,
        watch,
      });
    } catch (e) {
      print.error(e.message);
      process.exitCode = 1;
      return;
    }

    // Fall back to default values for options / parameters
    outputFormat = outputFormat && ['wasm', 'wast'].includes(outputFormat) ? outputFormat : 'wasm';
    outputDir = outputDir && outputDir !== '' ? outputDir : filesystem.path('build');
    manifest =
      manifest !== undefined && manifest !== '' ? manifest : filesystem.resolve('subgraph.yaml');
    networkFile =
      networkFile !== undefined && networkFile !== ''
        ? networkFile
        : filesystem.resolve('networks.json');

    // Show help text if requested
    if (help) {
      print.info(HELP);
      return;
    }

    let protocol;
    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);

      protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    } catch (e) {
      print.error(e.message);
      process.exitCode = 1;
      return;
    }

    buildDebug('Detected protocol "%s" (%o)', protocol.name, protocol);

    if (network && filesystem.exists(networkFile) !== 'file') {
      print.error(`Network file '${networkFile}' does not exists or is not a file!`);
      process.exitCode = 1;
      return;
    }

    if (network) {
      const identifierName = protocol.getContract()!.identifierName();
      await updateSubgraphNetwork(toolbox, manifest, network, networkFile, identifierName);
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
      process.exitCode = 1;
      return;
    }

    // Watch subgraph files for changes or additions, trigger
    // compile (if watch argument specified)
    if (watch) {
      await compiler.watchAndCompile();
    } else {
      const result = await compiler.compile();
      if (result === false) {
        process.exitCode = 1;
      }
    }
  },
};
