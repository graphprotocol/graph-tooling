#!/usr/bin/env node

let app = require('commander')
let path = require('path')

let TypeGenerator = require('./src/cli/type-generator')

app
  .version('0.1.0')
  .arguments('<cmd> [file]')
  .option(
    '-o, --output-dir [path]',
    'Output directory for the generated code',
    path.join(process.cwd(), 'dist')
  )
  .option(
    '--verbosity [info|verbose|debug]',
    'The log level to use (default: LOG_LEVEL or info)',
    process.env.LOG_LEVEL || 'info'
  )
  .option('-w, --watch', 'Rebuild automatically when files change')
  .parse(process.argv)

// Obtain the subgraph manifest file
let file = app.args.shift()
if (file === null || file === undefined) {
  app.help()
}

let generator = new TypeGenerator({
  subgraphManifest: file,
  outputDir: app.outputDir,
  verbosity: app.verbosity,
})

// Watch working directory for file updates or additions, trigger type generation (if watch argument specified)
if (app.watch) {
  generator.watchAndGenerateTypes()
} else {
  generator.generateTypes()
}
