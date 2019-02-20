const { build } = require('gluegun')

const run = async argv => {
  const cli = build()
    .brand('graph')
    .src(__dirname)
    .plugins('./node_modules', { matching: 'graph-cli-*', hidden: true })
    .help()
    .version()
    .defaultCommand()
    .create()

  return await cli.run(argv)
}

module.exports = { run }
