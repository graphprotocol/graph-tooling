#!/usr/bin/env node

var app = require('commander')

app
  .version('0.1.0')
  .command('codegen [file]', 'Generates TypeScript types for a data source definition')
  .command('build [file]', 'Compiles a data source definition for the WASM runtime', {
    isDefault: true,
  })
  .parse(process.argv)
