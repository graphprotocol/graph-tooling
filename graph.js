#!/usr/bin/env node

var app = require('commander')

app
  .version('0.1.0')
  .command('codegen [file]', 'Generates TypeScript types for a subgraph')
  .command('build [file]', 'Compiles a subgraph and uploads it to IPFS')
  .command('deploy [file]', 'Deploys the subgraph to a graph node')

app.command('*', { noHelp: true }).action(cmd => {
  console.error(' ')
  console.error('  Invalid command: %s\n', cmd)
  console.error('  ---')
  app.outputHelp()
  process.exit(1)
})

app.parse(process.argv)
