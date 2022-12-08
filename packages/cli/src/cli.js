import path from 'path'
import { exec } from 'child_process'
import which from 'which'
import { build, system } from 'gluegun'

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

export { run }
