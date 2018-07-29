#!/usr/bin/env node

var app = require('commander')

app
  .version('0.1.0')
  .command('codegen [file]', 'Generates TypeScript types for a package')
  .command('build [file]', 'Compiles a package and uploads it to IPFS', {
    isDefault: true,
  })
  .parse(process.argv)
