#!/usr/bin/env node

var app = require('commander')

app
  .version('0.1.0')
  .command('compile [file]', 'Compiles a data source definition for the WASM runtime', {
    isDefault: true,
  })
  .parse(process.argv)
