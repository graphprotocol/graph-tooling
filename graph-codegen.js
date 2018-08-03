#!/usr/bin/env node

let app = require('commander')
let path = require('path')
let chokidar = require('chokidar');

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
})
generator.generateTypes()

// Watch working directory for file updates or additions, trigger type generation (if watch argument specified)
if (app.watch) {
    console.log("Watching files, new types will be generated when file updates or additions are detected")
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
            watcher
                .on('add', path => {
                    generator.generateTypes()
                })
                .on('change', path => {
                    generator.generateTypes()
                });
        })
} else {
    generator.generateTypes()
}


