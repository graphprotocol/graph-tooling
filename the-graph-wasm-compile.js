#!/usr/bin/env node

let app = require('commander')
let path = require('path')

let Compiler = require('./lib/compiler')

app
  .version('0.1.0')
  .arguments('<cmd> [file]')
  .option(
    '-o, --output-dir [path]',
    'Output directory for build artifacts',
    path.join(process.cwd(), 'dist')
  )
  .parse(process.argv)

// Obtain the data source definition file
let file = app.args.shift()
if (file === null || file === undefined) {
  app.help()
}

let compiler = new Compiler({
  dataSourceFile: file,
  outputDir: app.outputDir,
})
compiler.compile()
