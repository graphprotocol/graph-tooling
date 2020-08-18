const path = require('path')
const { exec } = require('child_process')
const which = require('which')
const { build, system } = require('gluegun')

const run = async argv => {
  let cli = build()
    .brand('graph')
    .src(__dirname)

  const pluginDirs = []
  try {
    const npmGlobalRoot = await system.run('npm root -g', { trim: true })
    pluginDirs.push(npmGlobalRoot)
  } catch (_) {}
  try {
    const npmUserRoot = await system.run('npm root', { trim: true })
    pluginDirs.push(npmUserRoot)
  } catch (_) {}
  try {
    const yarnUserRoot = await system.run('yarn global dir', { trim: true })
    pluginDirs.push(yarnUserRoot)
  } catch (_) {}

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
