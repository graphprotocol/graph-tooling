import path from 'node:path';
import { Args, Command, Flags } from '@oclif/core';
import * as DataSourcesExtractor from '../command-helpers/data-sources.js';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs.js';
import { assertGraphTsVersion, assertManifestApiVersion } from '../command-helpers/version.js';
import debug from '../debug.js';
import Protocol from '../protocols/index.js';
import TypeGenerator from '../type-generator.js';

const codegenDebug = debug('graph-cli:codegen');

export default class CodegenCommand extends Command {
  static description = 'Generates AssemblyScript types for a subgraph.';

  static args = {
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),

    'output-dir': Flags.directory({
      summary: 'Output directory for generated types.',
      char: 'o',
      default: 'generated/',
    }),
    'skip-migrations': Flags.boolean({
      summary: 'Skip subgraph migrations.',
    }),
    watch: Flags.boolean({
      summary: 'Regenerate types when subgraph files change.',
      char: 'w',
    }),
    uncrashable: Flags.boolean({
      summary: 'Generate Float Subgraph Uncrashable helper file.',
      char: 'u',
    }),
    ipfs: Flags.string({
      summary: 'IPFS node to use for fetching subgraph data.',
      char: 'i',
      default: DEFAULT_IPFS_URL,
      hidden: true,
    }),
    'uncrashable-config': Flags.file({
      summary: 'Directory for uncrashable config.',
      aliases: ['uc'],
      // TODO: using a default sets the value and therefore requires --uncrashable
      // default: 'uncrashable-config.yaml',
      dependsOn: ['uncrashable'],
    }),
  };

  async run() {
    const {
      args: { 'subgraph-manifest': manifest },
      flags: {
        'output-dir': outputDir,
        'skip-migrations': skipMigrations,
        watch,
        ipfs,
        uncrashable,
        'uncrashable-config': uncrashableConfig,
      },
    } = await this.parse(CodegenCommand);

    codegenDebug('Initialized codegen manifest: %o', manifest);

    let protocol;
    let subgraphSources;
    try {
      // Checks to make sure codegen doesn't run against
      // older subgraphs (both apiVersion and graph-ts version).
      //
      // We don't want codegen to run without these conditions
      // because that would mean the CLI would generate code to
      // the wrong AssemblyScript version.
      await assertManifestApiVersion(manifest, '0.0.5');
      await assertGraphTsVersion(path.dirname(manifest), '0.25.0');

      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);
      protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
      subgraphSources = dataSourcesAndTemplates
        .filter((ds: any) => ds.kind == 'subgraph')
        .map((ds: any) => ds.source.address);
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    const generator = new TypeGenerator({
      subgraphManifest: manifest,
      outputDir,
      skipMigrations,
      protocol,
      uncrashable,
      subgraphSources,
      uncrashableConfig: uncrashableConfig || 'uncrashable-config.yaml',
      ipfsUrl: ipfs,
    });

    // Watch working directory for file updates or additions, trigger
    // type generation (if watch argument specified)
    if (watch) {
      await generator.watchAndGenerateTypes();
    } else if (!(await generator.generateTypes())) {
      process.exitCode = 1;
    }
  }
}
