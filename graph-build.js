#!/usr/bin/env node
let args = require('commander')
let app = require('./src/app')

app.initApp()
app.addBuildCommand()
app.parse()
let compiler = app.compilerFromArgs()

// Watch subgraph files for changes or additions, trigger compile (if watch argument specified)
if (args.watch) {
  compiler.watchAndCompile()
} else {
  compiler.compile()
}
