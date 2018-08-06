#!/usr/bin/env node

let app = require('commander')
let path = require('path')
let chokidar = require('chokidar');

let TypeGenerator = require('./src/cli/type-generator')
const chalk = require('chalk')

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
        'Setup directory watching to rebuild when files change')
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
    generator.logger.info(chalk.grey("Watching files, new types will be generated when file updates or additions are detected"))
    // Initialize watchers
    let watcher = chokidar.watch('.', {
        persistent: true,
        ignoreInitial: true,
        ignored: [
            './mappings',
            './*.ts',
            /(^|[\/\\])\../,
            './node_modules',
            './examples',
            './dist',
            '.yarn.lock'
        ],
        depth: 3,
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
                    // generator.logger.info(chalk.green('Types generated'))
                })
                .on('change', path => {
                    generator.logger.info(chalk.grey('File change detected, rebuilding types'))
                    generator.generateTypes()
                    generator.logger.info('')
                    // generator.logger.info(chalk.green('Types generated'))
                });
        })
} else {
    generator.generateTypes()
}


