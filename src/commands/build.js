const chalk = require('chalk')

const { createCompiler } = require('../command-helpers/compiler')
const { fixParameters } = require('../command-helpers/gluegun')
const DataSourcesExtractor = require('../command-helpers/data-sources')
const Protocol = require('../protocols')

const HELP = `
${chalk.bold('graph build')} [options] ${chalk.bold('[<subgraph-manifest>]')}

Options:

  -h, --help                    Show usage information
  -i, --ipfs <node>             Upload build results to an IPFS node
  -o, --output-dir <path>       Output directory for build results (default: build/)
  -t, --output-format <format>  Output format for mappings (wasm, wast) (default: wasm)
      --skip-migrations         Skip subgraph migrations (default: false)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
`

module.exports = {
  description: 'Builds a subgraph and (optionally) uploads it to IPFS',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

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
    } = toolbox.parameters.options

    // Support both short and long option variants
    help = help || h
    ipfs = ipfs || i
    outputDir = outputDir || o
    outputFormat = outputFormat || t
    watch = watch || w

    let manifest
    try {
      ;[manifest] = fixParameters(toolbox.parameters, {
        h,
        help,
        w,
        watch,
      })
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    // Fall back to default values for options / parameters
    outputFormat =
      outputFormat && ['wasm', 'wast'].indexOf(outputFormat) >= 0 ? outputFormat : 'wasm'
    outputDir = outputDir && outputDir !== '' ? outputDir : filesystem.path('build')
    manifest =
      manifest !== undefined && manifest !== ''
        ? manifest
        : filesystem.resolve('subgraph.yaml')

    // Show help text if requested
    if (help) {
      print.info(HELP)
      return
    }

    let protocol
    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest)

      protocol = Protocol.fromDataSources(dataSourcesAndTemplates)
    } catch (e) {
      print.error(e.message)
      process.exitCode = 1
      return
    }

    let compiler = createCompiler(manifest, {
      ipfs,
      outputDir,
      outputFormat,
      skipMigrations,
      protocol,
    })

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      process.exitCode = 1
      return
    }

    // Watch subgraph files for changes or additions, trigger
    // compile (if watch argument specified)
    if (watch) {
      await compiler.watchAndCompile()
    } else {
      let result = await compiler.compile()
      if (result === false) {
        process.exitCode = 1
      }
    }
  },
}
