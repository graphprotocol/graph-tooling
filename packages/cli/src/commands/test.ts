import { Args, Command, Flags } from '@oclif/core'
import { Matchstick, loadYamlConfig, checkForMatchstickBinary, downloadLatestBinary } from '@graph-tooling/matchstick'

export default class TestCommand extends Command {
  static description = 'Runs rust binary for subgraph testing.';

  static args = {
    datasource: Args.string(),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
    coverage: Flags.boolean({
      summary: 'Run the tests in coverage mode.',
      char: 'c',
    }),
    force: Flags.boolean({
      summary: 'Forces download of latest binary version.',
      char: 'f',
    }),
    logs: Flags.boolean({
      summary: 'Logs detailed information for debugging purposes.',
      char: 'l',
    }),
    recompile: Flags.boolean({
      summary: 'Force-recompile tests.',
      char: 'r',
    }),
    version: Flags.string({
      summary: 'Specify the version of the binary to use.',
      char: 'v',
    }),
  };

  async run() {
    const { args: { datasource }, flags } = await this.parse(TestCommand)

    // Load configuration from YAML file
    const config = loadYamlConfig('./matchstick.yaml')
    const testsDir = config.testsFolder || './tests'

    // Matchstick binary setup
    const matchstick = new Matchstick({
      version: flags.version,
      testsDir,
      forceDownload: flags.force,
      enableCoverage: flags.coverage,
      enableRecompile: flags.recompile,
      logs: flags.logs,
    })

    // Ensure binary is ready
    if (!checkForMatchstickBinary(testsDir) || flags.force) {
      await downloadLatestBinary(testsDir)
    }

    // Execute tests
    matchstick.run(datasource)
  }
}

