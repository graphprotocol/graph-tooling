const chalk = require('chalk')
const TypeGenerator = require('../type-generator')

const HELP = `
${chalk.bold('graph codegen')} [options] ${chalk.bold('[<subgraph-manifest>]')}

Options:

  -h, --help                    Show usage information
  -o, --output-dir <path>       Output directory for generated types (default: generated/)
  -w, --watch                   Regenerate types when subgraph files change (default: false)
`

module.exports = {
  description: 'Generates AssemblyScript types for a subgraph',
  run: async toolbox => {
    // Obtain tools
    let { filesystem, print, system } = toolbox

    // Read CLI parameters
    let { h, help, outputDir, watch } = toolbox.parameters.options
    outputDir =
      outputDir !== undefined && outputDir !== ''
        ? outputDir
        : filesystem.path('generated')
    let manifest =
      toolbox.parameters.first !== undefined && toolbox.parameters.first !== ''
        ? toolbox.parameters.first
        : filesystem.resolve('subgraph.yaml')

    // Show help text if requested
    if (h || help) {
      print.info(HELP)
      return
    }

    let generator = new TypeGenerator({
      subgraphManifest: manifest,
      outputDir: outputDir,
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
