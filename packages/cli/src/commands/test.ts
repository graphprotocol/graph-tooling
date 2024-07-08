import { exec, spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { Binary } from 'binary-install-raw';
import { filesystem, patching, print, system } from 'gluegun';
import yaml from 'js-yaml';
import semver from 'semver';
import { Args, Command, Flags } from '@oclif/core';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';
import fetch from '../fetch';

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
    docker: Flags.boolean({
      summary:
        'Run the tests in a docker container (Note: Please execute from the root folder of the subgraph).',
      char: 'd',
    }),
    force: Flags.boolean({
      summary:
        'Binary - overwrites folder + file when downloading. Docker - rebuilds the docker image.',
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
      flags: { coverage, docker, force, logs, recompile, version },
    } = await this.parse(TestCommand);

    let testsDir = './tests';

    // Check if matchstick.yaml config exists
    if (filesystem.exists('matchstick.yaml')) {
      try {
        // Load the config
        const config = await yaml.load(filesystem.read('matchstick.yaml', 'utf8')!);
        // Check if matchstick.yaml and testsFolder not null
        if (config?.testsFolder) {
          // assign test folder from matchstick.yaml if present
          testsDir = config.testsFolder;
        }
      } catch (error) {
        this.error(`A problem occurred while reading "matchstick.yaml":\n${error.message}`, {
          exit: 1,
        });
      }
    }

    const cachePath = path.resolve(testsDir, '.latest.json');
    const opts = {
      testsDir,
      cachePath,
      coverage,
      docker,
      force,
      logs,
      recompile,
      version,
      latestVersion: getLatestVersionFromCache(cachePath),
    };

    // Fetch the latest version tag if version is not specified with -v/--version or if the version is not cached
    if (opts.force || (!opts.version && !opts.latestVersion)) {
      this.log('Fetching latest version tag...');
      const result = await fetch(
        'https://api.github.com/repos/LimeChain/matchstick/releases/latest',
        {
          headers: {
            ...GRAPH_CLI_SHARED_HEADERS,
          },
        },
      );
      const json = await result.json();
      opts.latestVersion = json.tag_name;

      filesystem.file(opts.cachePath, {
        content: {
          version: json.tag_name,
          timestamp: Date.now(),
        },
      });
    }

    if (opts.docker) {
      runDocker.bind(this)(datasource, opts);
    } else {
      runBinary.bind(this)(datasource, opts);
    }
  }
}

function getLatestVersionFromCache(cachePath: string) {
  if (filesystem.exists(cachePath) == 'file') {
    const cached = filesystem.read(cachePath, 'json');
    // Get the cache age in days
    const cacheAge = (Date.now() - cached.timestamp) / (1000 * 60 * 60 * 24);
    // If cache age is less than 1 day, use the cached version
    if (cacheAge < 1) {
      return cached.version as string;
    }
  }
  return null;
}

async function runBinary(
  this: TestCommand,
  datasource: string | undefined,
  opts: {
    coverage: boolean;
    force: boolean;
    logs: boolean;
    version: string | undefined;
    latestVersion: string | null;
    recompile: boolean;
  },
) {
  const coverageOpt = opts.coverage;
  const forceOpt = opts.force;
  const logsOpt = opts.logs;
  const versionOpt = opts.version;
  const latestVersion = opts.latestVersion;
  const recompileOpt = opts.recompile;

  const platform = await getPlatform.bind(this)(versionOpt || latestVersion, logsOpt);

  const url = `https://github.com/LimeChain/matchstick/releases/download/${
    versionOpt || latestVersion
  }/${platform}`;

  if (logsOpt) {
    this.log(`Download link: ${url}`);
  }

  const binary = new Binary(platform, url, versionOpt || latestVersion);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  forceOpt ? await binary.install(true) : await binary.install(false);
  const args = [];

  if (coverageOpt) args.push('-c');
  if (recompileOpt) args.push('-r');
  if (datasource) args.push(datasource);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  args.length > 0 ? binary.run(...args) : binary.run();
}

async function getPlatform(
  this: TestCommand,
  matchstickVersion: string | null,
  logsOpt: boolean | undefined,
) {
  const type = os.type();
  const arch = os.arch();
  const cpuCore = os.cpus()[0];
  const isAppleSilicon = arch === 'arm64' && /Apple (M1|M2|M3|processor)/.test(cpuCore.model);
  const linuxInfo = type === 'Linux' ? await getLinuxInfo.bind(this)() : {};
  const linuxDistro = linuxInfo.name;
  const release = linuxInfo.version || os.release();
  const majorVersion = parseInt(linuxInfo.version || '', 10) || semver.major(release);

  if (logsOpt) {
    this.log(
      `OS type: ${
        linuxDistro || type
      }\nOS arch: ${arch}\nOS release: ${release}\nOS major version: ${majorVersion}\nCPU model: ${
        cpuCore.model
      }`,
    );
  }

  if (arch === 'x64' || isAppleSilicon) {
    if (semver.gt(matchstickVersion!, '0.5.4')) {
      if (type === 'Darwin') {
        if (isAppleSilicon) {
          return 'binary-macos-12-m1';
        }
        return 'binary-macos-12';
      }
      if (type === 'Linux' && majorVersion === 22) {
        return 'binary-linux-22';
      }
    } else {
      if (type === 'Darwin') {
        if (majorVersion === 18 || majorVersion === 19) {
          return 'binary-macos-10.15';
        }
        if (isAppleSilicon) {
          return 'binary-macos-11-m1';
        }
        return 'binary-macos-11';
      }
      if (type === 'Linux') {
        return majorVersion === 18
          ? 'binary-linux-18'
          : majorVersion === 22
          ? 'binary-linux-22'
          : 'binary-linux-20';
      }
    }
  }

  throw new Error(`Unsupported platform: ${type} ${arch} ${majorVersion}`);
}

/**
 * The result of running `cat /etc/*-release | grep -E '(^VERSION|^NAME)='`
 *
 * May look like this:
 * ```sh
 * NAME="Ubuntu"
 * VERSION="16.04.7 LTS (Xenial Xerus)"
 * ```
 */
interface LinuxInfo {
  name?: string;
  version?: string;
}

async function getLinuxInfo(this: TestCommand): Promise<LinuxInfo> {
  try {
    const result = await system.run("cat /etc/*-release | grep -E '(^VERSION|^NAME)='", {
      trim: true,
    });
    const infoArray = result
      .replace(/['"]+/g, '')
      .split('\n')
      .map(p => p.split('='));
    const linuxInfo: LinuxInfo = {};

    for (const val of infoArray) {
      linuxInfo[val[0].toLowerCase() as keyof LinuxInfo] = val[1];
    }

    return linuxInfo;
  } catch (error) {
    this.error(`Error fetching the Linux version:\n${error}`, { exit: 1 });
  }
}

async function runDocker(
  this: TestCommand,
  datasource: string | undefined,
  opts: {
    testsDir: string;
    coverage: boolean;
    force: boolean;
    version: string | undefined;
    latestVersion: string | null;
    recompile: boolean;
  },
) {
  const coverageOpt = opts.coverage;
  const forceOpt = opts.force;
  const versionOpt = opts.version;
  const latestVersion = opts.latestVersion;
  const recompileOpt = opts.recompile;

  // Remove binary-install-raw binaries, because docker has permission issues
  // when building the docker images
  filesystem.remove('./node_modules/binary-install-raw/bin');

  // Get current working directory
  const current_folder = filesystem.cwd();

  // Declate dockerfilePath with default location
  const dockerfilePath = path.join(opts.testsDir, '.docker/Dockerfile');

  // Check if the Dockerfil already exists
  const dockerfileExists = filesystem.exists(dockerfilePath);

  // Generate the Dockerfile only if it doesn't exists,
  // version flag and/or force flag is passed.
  if (!dockerfileExists || versionOpt || forceOpt) {
    await dockerfile.bind(this)(dockerfilePath, versionOpt, latestVersion);
  }

  // Run a command to check if matchstick image already exists
  exec('docker images -q matchstick', (_error, stdout, _stderr) => {
    // Collect all(if any) flags and options that have to be passed to the matchstick binary
    let testArgs = '';
    if (coverageOpt) testArgs = testArgs + ' -c';
    if (recompileOpt) testArgs = testArgs + ' -r';
    if (datasource) testArgs = testArgs + ' ' + datasource;

    // Build the `docker run` command options and flags
    const dockerRunOpts = [
      'run',
      '-it',
      '--rm',
      '--mount',
      `type=bind,source=${current_folder},target=/matchstick`,
    ];

    if (testArgs !== '') {
      dockerRunOpts.push('-e');
      dockerRunOpts.push(`ARGS=${testArgs.trim()}`);
    }

    dockerRunOpts.push('matchstick');

    // If a matchstick image does not exists, the command returns an empty string,
    // else it'll return the image ID. Skip `docker build` if an image already exists
    // Delete current image(if any) and rebuild.
    // Use spawn() and {stdio: 'inherit'} so we can see the logs in real time.
    if (!dockerfileExists || stdout === '' || versionOpt || forceOpt) {
      if (stdout !== '') {
        exec('docker image rm matchstick', (_error, stdout, _stderr) => {
          this.log(`Remove matchstick image result:\n${stdout}`);
        });
      }
      // Build a docker image. If the process has executed successfully
      // run a container from that image.
      spawn('docker', ['build', '-f', dockerfilePath, '-t', 'matchstick', '.'], {
        stdio: 'inherit',
      }).on('close', code => {
        if (code === 0) {
          spawn('docker', dockerRunOpts, { stdio: 'inherit' });
        }
      });
    } else {
      this.log('Docker image already exists. Skipping `docker build` command...');
      // Run the container from the existing matchstick docker image
      spawn('docker', dockerRunOpts, { stdio: 'inherit' });
    }
  });
}

// Downloads Dockerfile template from the demo-subgraph repo
// Replaces the placeholders with their respective values
async function dockerfile(
  this: TestCommand,
  dockerfilePath: string,
  versionOpt: string | null | undefined,
  latestVersion: string | null | undefined,
) {
  const spinner = print.spin('Generating Dockerfile...');

  try {
    // Fetch the Dockerfile template content from the demo-subgraph repo
    const content = await fetch(
      'https://raw.githubusercontent.com/LimeChain/demo-subgraph/main/Dockerfile',
    ).then(response => {
      if (response.ok) {
        return response.text();
      }
      throw new Error(`Status Code: ${response.status}, with error: ${response.statusText}`);
    });

    // Write the Dockerfile
    filesystem.write(dockerfilePath, content);

    // Replaces the version placeholders
    await patching.replace(
      dockerfilePath,
      '<MATCHSTICK_VERSION>',
      versionOpt || latestVersion || 'unknown',
    );
  } catch (error) {
    this.error(`A problem occurred while generating the Dockerfile:\n${error.message}`, {
      exit: 1,
    });
  }

  spinner.succeed('Successfully generated Dockerfile.');
}
