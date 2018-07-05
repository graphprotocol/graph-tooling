#!/usr/bin/env node

let app = require('commander')
let path = require('path')
let ipfsAPI = require('ipfs-api')

let Compiler = require('./cli-lib/compiler')

app
  .version('0.1.0')
  .arguments('<cmd> [file]')
  .option(
    '-o, --output-dir [path]',
    'Output directory for build artifacts',
    path.join(process.cwd(), 'dist')
  )
  .option(
    '--verbosity [info|verbose|debug]',
    'The log level to use (default: LOG_LEVEL or info)',
    process.env.LOG_LEVEL || 'info'
  )
  .option('-t, --output-format [format]', 'Output format (wasm, wast)', 'wasm')
  .option('i, --ipfs [addr]', 'IPFS node to use for uploading files')

app.on('--help', function() {
  console.log('')
  console.log('  IPFS:')
  console.log('')
  if (app.ipfs === null || app.ipfs === undefined) {
    console.log('    No IPFS node defined with -i/--ipfs')
  } else {
    console.log('    ${app.ipfs}')
  }
  console.log('')
})

app.parse(process.argv)

// Obtain the data source definition file
let file = app.args.shift()
if (file === null || file === undefined) {
  app.help()
}

// Connect to the IPFS node (if a node address was provided)
let ipfs = app.ipfs ? ipfsAPI(app.ipfs) : undefined

// Compile the data source
new Compiler({
  ipfs: ipfs,
  dataSourceFile: file,
  outputDir: app.outputDir,
  outputFormat: app.outputFormat,
  verbosity: app.verbosity,
}).compile()
