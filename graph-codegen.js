#!/usr/bin/env node

let app = require('commander')
let path = require('path')
let chokidar = require('chokidar');
let chalk = require('chalk')

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
  .option(
    '-w, --watch',
    'Rebuild automatically when files change')
  .parse(process.argv)

// Obtain the subgraph manifest file
let file = app.args.shift()
if (file === null || file === undefined) {
  app.help()
}

let generator = new TypeGenerator({
  subgraphManifest: file,
  outputDir: app.outputDir,
  verbosity: app.verbosity
})

// Watch working directory for file updates or additions, trigger type generation (if watch argument specified)
if (app.watch) {
  generator.logger.info('')
  generator.logger.info('%s %s', chalk.grey("Watching:"), process.cwd())
  // Initialize watchers
  let watcher = chokidar.watch('.', {
    persistent: true,
    ignoreInitial: true,
    ignored: [
      './**/*.types.ts',
      './**/*.ts',
      './dist',
      './examples',
      './mappings',
      './node_modules',
      /(^|[\/\\])\../
    ],
    depth: 3,
    atomic: 500
  })

  // Add event listeners.
  watcher
    .on('ready', function() {
      generator.generateTypes()
      generator.logger.info('')
      watcher
        .on('add', path => {
          generator.logger.info(chalk.grey('New file detected, rebuilding types'))
          generator.generateTypes()
          generator.logger.info('')
        })
        .on('change', path => {
          generator.logger.info(chalk.grey('File change detected, rebuilding types'))
          generator.generateTypes()
          generator.logger.info('')
        });
      })

  // Catch keyboard interrupt: close watcher and exit process
  process.on('SIGINT', function() {
    watcher.close()
    process.exit()
  })
} else {
  generator.generateTypes()
}


