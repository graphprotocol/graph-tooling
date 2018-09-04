#!/usr/bin/env node

let app = require('commander')
let args = require('./src/cli/args')

args.addBuildCommand()
app.parse(process.argv)
let compiler = args.compilerFromArgs()

// Watch subgraph files for changes or additions, trigger compile (if watch argument specified)
if (app.watch) {
  compiler.watchAndCompile()
} else {
  compiler.compile()
}
