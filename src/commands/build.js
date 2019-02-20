const chalk = require('chalk')

const { createCompiler } = require('../command-helpers/compiler')

const HELP = `
${chalk.bold('graph build')} [options] ${chalk.bold('[<subgraph-manifest>]')}

Options:

  -h, --help                Show usage information
      --ipfs <node>         Upload build results to an IPFS node
  -o, --output-dir <path>   Output directory for build results (default: build/)
  -t, --output-format <format> 
                            Output format for mappings (wasm, wast) (default: wasm)
  -w, --watch               Regenerate types when subgraph files change (default: false)
`

module.exports = {
  description: 'Builds a subgraph and (optionally) uploads it to IPFS',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Parse CLI parameters
    let { h, help, ipfs, outputDir, outputFormat, watch } = toolbox.parameters.options
    outputFormat =
      outputFormat && ['wasm', 'wast'].indexOf(outputFormat) >= 0 ? outputFormat : 'wasm'
    outputDir = outputDir && outputDir !== '' ? outputDir : filesystem.path('build')
    let manifest =
      toolbox.parameters.first !== undefined && toolbox.parameters.first !== ''
        ? toolbox.parameters.first
        : filesystem.resolve('subgraph.yaml')

    // Show help text if requested
    if (h || help) {
      print.info(HELP)
      return
    }

    let compiler = createCompiler(manifest, {
      ipfs,
      outputDir,
      outputFormat,
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
