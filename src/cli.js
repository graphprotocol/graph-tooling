const path = require('path')
const { exec } = require('child_process')
const which = require('which')
const { build, system } = require('gluegun')

const run = async argv => {
  let cli = build()
    .brand('graph')
    .src(__dirname)

  const pluginDirs = (
    await Promise.all(
      ['npm root -g', 'npm root', 'yarn global dir'].map(async cmd => {
        try {
          return await system.run(cmd, { trim: true })
        } catch (_) {
          return undefined
        }
      }),
    )
  ).filter(dir => dir !== undefined)

  // Inject potential plugin directories
  cli = pluginDirs.reduce(
    (cli, dir) => cli.plugin(path.join(dir, '@graphprotocol', 'indexer-cli', 'dist')),
    cli,
  )

  cli = cli
    .help()
    .version()
    .defaultCommand()
    .create()

  return await cli.run(argv)
}

module.exports = { run }
