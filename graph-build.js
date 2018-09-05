#!/usr/bin/env node

let app = require('./src/cli/app')

app.initApp()
app.addBuildCommand()
app.parse()
let compiler = app.compilerFromArgs()

// Watch subgraph files for changes or additions, trigger compile (if watch argument specified)
if (app.watch) {
  compiler.watchAndCompile()
} else {
  compiler.compile()
}
