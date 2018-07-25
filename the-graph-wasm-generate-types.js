#!/usr/bin/env node

let app = require('commander')
let path = require('path')

let TypeGenerator = require('./src/cli/type-generator')

app
  .version('0.1.0')
  .arguments('<cmd> [file]')
  .option(
    '-o, --output-dir [path]',
    'Output directory for files holding the generated types',
    path.join(process.cwd(), 'dist')
  )
  .parse(process.argv)

// Obtain the data source definition file
let file = app.args.shift()
if (file === null || file === undefined) {
  app.help()
}

let generator = new TypeGenerator({
  dataSourceFile: file,
  outputDir: app.outputDir,
})
generator.generateTypes()
