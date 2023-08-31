import { filesystem, print } from 'gluegun';
import { Command, Flags } from '@oclif/core';

export default class CleanCommand extends Command {
  static description = 'Clean the cache and generated files.';

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
    'codegen-dir': Flags.directory({
      summary: 'Directory where the "graph codegen" code is stored.',
      default: 'generated/',
    }),
    'build-dir': Flags.directory({
      summary: 'Directory where the "graph build" code is stored.',
      default: 'build/',
    }),
  };

  async run() {
    const {
      flags: { 'codegen-dir': codegenDir, 'build-dir': buildDir },
    } = await this.parse(CleanCommand);
    const spinner = print.spin(`Cleaning cache and generated files`);

    spinner.start();
    try {
      await filesystem.removeAsync(codegenDir);
      await filesystem.removeAsync(buildDir);
      spinner.succeed();
      print.success('Cache and generated files cleaned');
    } catch (e) {
      spinner.fail('Failed to clean cache and generated files');
    } finally {
      spinner.stop();
    }
  }
}
