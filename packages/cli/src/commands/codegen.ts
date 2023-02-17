import path from 'path';
import { Args, Command, Flags } from '@oclif/core';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { assertGraphTsVersion, assertManifestApiVersion } from '../command-helpers/version';
import debug from '../debug';
import Protocol from '../protocols';
import TypeGenerator from '../type-generator';

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
        uncrashable,
        'uncrashable-config': uncrashableConfig,
      },
    } = await this.parse(CodegenCommand);

    codegenDebug('Initialized codegen manifest: %o', manifest);

    let protocol;
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
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    const generator = new TypeGenerator({
      subgraphManifest: manifest,
      outputDir,
      skipMigrations,
      protocol,
      uncrashable,
      uncrashableConfig: uncrashableConfig || 'uncrashable-config.yaml',
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
