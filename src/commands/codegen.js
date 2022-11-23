const chalk = require('chalk')
const path = require('path')

const TypeGenerator = require('../type-generator')
const Protocol = require('../protocols')
const { fixParameters } = require('../command-helpers/gluegun')
const DataSourcesExtractor = require('../command-helpers/data-sources')
const {
  assertManifestApiVersion,
  assertGraphTsVersion,
} = require('../command-helpers/version')

const HELP = `
${chalk.bold('graph codegen')} [options] ${chalk.bold('[<subgraph-manifest>]')}
Options:
  -h, --help                    Show usage information
  -o, --output-dir <path>       Output directory for generated types (default: generated/)
  --skip-migrations         Skip subgraph migrations (default: false)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
  -u, --uncrashable            Generate Float Subgraph Uncrashable helper file
  -uc, --uncrashable-config <path>  Directory for uncrashable config (default: ./uncrashable-config.yaml)
  `

let codegenDebug = require('../debug')('graph-cli:codegen')

module.exports = {
  description: 'Generates AssemblyScript types for a subgraph',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Read CLI parameters
    let {
      h,
      help,
      o,
      outputDir,
      skipMigrations,
      w,
      watch,
      u,
      uncrashable,
      uc,
      uncrashableConfig,
    } = toolbox.parameters.options

    // Support both long and short option variants
    help = help || h
    outputDir = outputDir || o
    watch = watch || w
    uncrashable = uncrashable || u
    uncrashable_config = uncrashableConfig || uc

    let manifest
    try {
      ;[manifest] = fixParameters(toolbox.parameters, {
        h,
        help,
        skipMigrations,
        w,
        watch,
        u,
        uncrashable,
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    codegenDebug('Initialized codegen manifest: %o', manifest)

    // Fall back to default values for options / parameters
    outputDir =
      outputDir !== undefined && outputDir !== ''
        ? outputDir
        : filesystem.path('generated')
    manifest =
      manifest !== undefined && manifest !== ''
        ? manifest
        : filesystem.resolve('subgraph.yaml')

    uncrashable_config =
      uncrashable_config !== undefined && uncrashable_config !== ''
        ? uncrashable_config
        : filesystem.resolve('uncrashable-config.yaml')

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    let protocol
    try {
      // Checks to make sure codegen doesn't run against
      // older subgraphs (both apiVersion and graph-ts version).
      //
      // We don't want codegen to run without these conditions
      // because that would mean the CLI would generate code to
      // the wrong AssemblyScript version.
      await assertManifestApiVersion(manifest, '0.0.5')
      await assertGraphTsVersion(path.dirname(manifest), '0.25.0')

      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest)

      protocol = Protocol.fromDataSources(dataSourcesAndTemplates)
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    let generator = new TypeGenerator({
      subgraphManifest: manifest,
      outputDir: outputDir,
      skipMigrations,
      protocol,
      uncrashable,
      uncrashableConfig: uncrashable_config,
    })

    // Watch working directory for file updates or additions, trigger
    // type generation (if watch argument specified)
    if (watch) {
      await generator.watchAndGenerateTypes()
    } else {
      if (!(await generator.generateTypes())) {
        process.exitCode = 1
      }
    }
  },
}
