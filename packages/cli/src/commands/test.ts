import { execSync } from 'child_process'
import path from 'path'
import { filesystem } from 'gluegun'
import yaml from 'js-yaml'
// This'd import the N-API bindings based on the OS and architecture
import { Args, Command, Flags } from '@oclif/core'

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
      summary: 'Binary - overwrites folder + file when downloading.',
      char: 'f',
    }),
    logs: Flags.boolean({
      summary:
        'Logs to the console information about the OS, CPU model and download url (debugging purposes).',
      char: 'l',
    }),
    recompile: Flags.boolean({
      summary: 'Force-recompile tests.',
      char: 'r',
    }),
    version: Flags.string({
      summary: 'Choose the version of the rust binary that you want to be downloaded/used.',
      char: 'v',
    }),
  };

  async run() {
    const {
      args: { datasource },
      flags: { coverage, force, logs, recompile, version },
    } = await this.parse(TestCommand)

    // Ensure PostgreSQL 16 is installed
    try {
      const versionOutput = execSync('psql --version').toString()
      const versionMatch = versionOutput.match(/\b(14|15|16)\.\d+/)
      if (!versionMatch) {
        this.error(`PostgreSQL version >=14 is required. Detected version: ${versionOutput}`, {
          exit: 1,
        })
      }
    } catch (error) {
      this.error(
        `PostgreSQL version >=14 is required. It seems PostgreSQL is not installed.\n
      To install PostgreSQL 16:\n
      On Linux (Ubuntu/Debian based):
      sudo apt update
      sudo apt install -y postgresql-16

      On macOS:
      brew install postgresql@16`,
        {
          exit: 1,
        },
      )
    }

    let testsDir = './tests'

    // Check if matchstick.yaml config exists
    if (filesystem.exists('matchstick.yaml')) {
      try {
        // Load the config
        const config = await yaml.load(filesystem.read('matchstick.yaml', 'utf8')!)
        // Check if matchstick.yaml and testsFolder not null
        if (config?.testsFolder) {
          // assign test folder from matchstick.yaml if present
          testsDir = config.testsFolder
        }
      } catch (error) {
        this.error(`A problem occurred while reading "matchstick.yaml":\n${error.message}`, {
          exit: 1,
        })
      }
    }

    const cachePath = path.resolve(testsDir, '.latest.json')
    const opts = {
      testsDir,
      cachePath,
      coverage,
      force,
      logs,
      recompile,
      version,
      latestVersion: getLatestVersionFromCache(cachePath),
    }

    runNapi.bind(this)(datasource, opts)
  }
}

function getLatestVersionFromCache(cachePath: string) {
  if (filesystem.exists(cachePath) == 'file') {
    const cached = filesystem.read(cachePath, 'json')
    // Get the cache age in days
    const cacheAge = (Date.now() - cached.timestamp) / (1000 * 60 * 60 * 24)
    // If cache age is less than 1 day, use the cached version
    if (cacheAge < 1) {
      return cached.version as string
    }
  }
  return null
}

async function runNapi(
  this: TestCommand,
  datasource: string | undefined,
  opts: {
    coverage: boolean
    force: boolean
    logs: boolean
    version: string | undefined
    latestVersion: string | null
    recompile: boolean
  },
) {
  const args = []

  if (opts.coverage) args.push('--coverage')
  if (opts.recompile) args.push('--recompile')
  if (datasource) args.push(datasource)

  try {
    // Dynamically import runTests only after PostgreSQL check
    const { runTests } = await import('@graphprotocol/graph-tooling-napi-utils/mod/testing')
    // Call the N-API function
    runTests(args)
  } catch (error) {
    this.error(`Error running tests:\n${error.message}`, {
      exit: 1,
    })
  }
}
