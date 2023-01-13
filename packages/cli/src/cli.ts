import path from 'path';
import { build, system } from 'gluegun';

const run = async (argv: string[]) => {
  let builder = build().brand('graph').src(__dirname);

  const pluginDirs: string[] = [];
  await Promise.all(
    ['npm root -g', 'npm root', 'yarn global dir'].map(async cmd => {
      try {
        const dir = await system.run(cmd, { trim: true });
        pluginDirs.push(dir);
      } catch (_) {
        // noop
      }
    }),
  );

  // Inject potential plugin directories
  builder = pluginDirs.reduce(
    (cli, dir) => cli.plugin(path.join(dir, '@graphprotocol', 'indexer-cli', 'dist')),
    builder,
  );

  const cli = builder.help().version().defaultCommand().create();

  return await cli.run(argv);
};

export { run };
