import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import compose from 'docker-compose';
import { filesystem, patching } from 'gluegun';
import stripAnsi from 'strip-ansi';
import tmp from 'tmp-promise';
import { Args, Command, Flags } from '@oclif/core';
import { step, withSpinner } from '../command-helpers/spinner';

// Clean up temporary files even when an uncaught exception occurs
tmp.setGracefulCleanup();

export default class LocalCommand extends Command {
  static description =
    'Runs local tests against a Graph Node environment (using Ganache by default).';

  static args = {
    'local-command': Args.string({
      required: true,
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),

    'node-logs': Flags.boolean({
      summary: 'Print the Graph Node logs.',
    }),
    'ethereum-logs': Flags.boolean({
      summary: 'Print the Ethereum logs.',
    }),
    'compose-file': Flags.file({
      summary: 'Custom Docker Compose file for additional services.',
    }),
    'node-image': Flags.string({
      summary: 'Custom Graph Node image to test against.',
      default: 'graphprotocol/graph-node:latest',
    }),
    'standalone-node': Flags.string({
      summary: 'Use a standalone Graph Node outside Docker Compose.',
    }),
    'standalone-node-args': Flags.string({
      summary: 'Custom arguments to be passed to the standalone Graph Node.',
      dependsOn: ['standalone-node'],
    }),
    'skip-wait-for-ipfs': Flags.boolean({
      summary: "Don't wait for IPFS to be up at localhost:15001",
    }),
    'skip-wait-for-ethereum': Flags.boolean({
      summary: "Don't wait for Ethereum to be up at localhost:18545",
    }),
    // TODO: Remove in next major release
    'skip-wait-for-etherium': Flags.boolean({
      summary: "Don't wait for Ethereum to be up at localhost:18545",
      deprecated: {
        message: 'Use --skip-wait-for-ethereum instead',
      },
    }),
    'skip-wait-for-postgres': Flags.boolean({
      summary: "Don't wait for Postgres to be up at localhost:15432",
    }),
    timeout: Flags.integer({
      summary: 'Time to wait for service containers in milliseconds.',
      default: 120_000,
    }),
  };

  async run() {
    const {
      args: { 'local-command': testCommand },
      flags: {
        'compose-file': composeFileFlag,
        'ethereum-logs': ethereumLogsFlag,
        'node-image': nodeImage,
        'node-logs': nodeLogsFlag,
        'skip-wait-for-etherium': skipWaitForEthereumTypo,
        'skip-wait-for-ethereum': skipWaitForEthereumGood,
        'skip-wait-for-ipfs': skipWaitForIpfs,
        'skip-wait-for-postgres': skipWaitForPostgres,
        'standalone-node': standaloneNode,
        'standalone-node-args': standaloneNodeArgs,
        timeout,
      },
    } = await this.parse(LocalCommand);

    const skipWaitForEthereum = skipWaitForEthereumTypo || skipWaitForEthereumGood;

    // Obtain the Docker Compose file for services that the tests run against
    const composeFile =
      composeFileFlag ||
      path.join(
        __dirname,
        '..',
        '..',
        'resources',
        'test',
        standaloneNode ? 'docker-compose-standalone-node.yml' : 'docker-compose.yml',
      );

    if (!filesystem.exists(composeFile)) {
      this.error(`Docker Compose file "${composeFile}" not found`, { exit: 1 });
    }

    // Create temporary directory to operate in
    const { path: tempdir } = await tmp.dir({
      prefix: 'graph-test',
      unsafeCleanup: true,
    });
    try {
      await configureTestEnvironment(tempdir, composeFile, nodeImage);
    } catch (e) {
      this.exit(1);
      return;
    }

    // Bring up test environment
    try {
      await startTestEnvironment(tempdir);
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    // Wait for test environment to come up
    try {
      await waitForTestEnvironment({
        skipWaitForEthereum,
        skipWaitForIpfs,
        skipWaitForPostgres,
        timeout,
      });
    } catch (e) {
      await stopTestEnvironment(tempdir);
      this.exit(1);
      return;
    }

    // Bring up Graph Node separately, if a standalone node is used
    let nodeProcess;
    const nodeOutputChunks: Buffer[] = [];
    if (standaloneNode) {
      try {
        nodeProcess = await startGraphNode(standaloneNode, standaloneNodeArgs, nodeOutputChunks);
      } catch (e) {
        await stopTestEnvironment(tempdir);
        let errorMessage = '\n';
        errorMessage += '  Graph Node';
        errorMessage += '  ----------';
        errorMessage += indent('  ', Buffer.concat(nodeOutputChunks).toString('utf-8'));
        errorMessage += '\n';
        this.error(errorMessage, { exit: 1 });
      }
    }

    // Wait for Graph Node to come up
    try {
      await waitForGraphNode(timeout);
    } catch (e) {
      await stopTestEnvironment(tempdir);
      let errorMessage = '\n';
      errorMessage += '  Graph Node';
      errorMessage += '  ----------';
      errorMessage += indent(
        '  ',
        await collectGraphNodeLogs(tempdir, standaloneNode, nodeOutputChunks),
      );
      errorMessage += '\n';
      this.error(errorMessage, { exit: 1 });
    }

    // Run tests
    const result = await runTests(testCommand);

    // Bring down Graph Node, if a standalone node is used
    if (nodeProcess) {
      try {
        await stopGraphNode(nodeProcess);
      } catch (e) {
        // do nothing (the spinner already logs the problem)
      }
    }

    if (result.exitCode == 0) {
      this.log('✔ Tests passed');
    } else {
      this.log('✖ Tests failed');
    }

    // Capture logs
    const nodeLogs =
      nodeLogsFlag || result.exitCode !== 0
        ? await collectGraphNodeLogs(tempdir, standaloneNode, nodeOutputChunks)
        : undefined;
    const ethereumLogs = ethereumLogsFlag ? await collectEthereumLogs(tempdir) : undefined;

    // Bring down the test environment
    try {
      await stopTestEnvironment(tempdir);
    } catch (e) {
      // do nothing (the spinner already logs the problem)
    }

    if (nodeLogs) {
      this.log('');
      this.log('  Graph node');
      this.log('  ----------');
      this.log('');
      this.log(indent('  ', nodeLogs));
    }

    if (ethereumLogs) {
      this.log('');
      this.log('  Ethereum');
      this.log('  --------');
      this.log('');
      this.log(indent('  ', ethereumLogs));
    }

    // Always print the test output
    this.log('');
    this.log('  Output');
    this.log('  ------');
    this.log('');
    this.log(indent('  ', result.output));

    // Propagate the exit code from the test run
    this.exit(result.exitCode);
  }
}

/**
 * Indents all lines of a string
 */
const indent = (indentation: string, str: string) =>
  str
    .split('\n')
    .map(s => `${indentation}${s}`)
    // Remove whitespace from empty lines
    .map(s => s.replace(/^\s+$/g, ''))
    .join('\n');

const configureTestEnvironment = async (tempdir: string, composeFile: string, nodeImage: string) =>
  await withSpinner(
    `Configure test environment`,
    `Failed to configure test environment`,
    `Warnings configuring test environment`,
    async () => {
      // Temporary compose file
      const tempComposeFile = path.join(tempdir, 'compose', 'docker-compose.yml');

      // Copy the compose file to the temporary directory
      filesystem.copy(composeFile, tempComposeFile);

      // Substitute the graph-node image with the custom one, if appropriate
      if (nodeImage) {
        await patching.replace(tempComposeFile, 'graphprotocol/graph-node:latest', nodeImage);
      }
    },
  );

const waitFor = async (timeout: number, testFn: () => void) => {
  const deadline = Date.now() + timeout;
  let error: Error | undefined = undefined;
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (Date.now() > deadline) {
        reject(error);
      } else {
        try {
          const result = await testFn();
          resolve(result);
        } catch (e) {
          error = e;
          setTimeout(check, 500);
        }
      }
    };

    setTimeout(check, 0);
  });
};

const startTestEnvironment = async (tempdir: string) =>
  await withSpinner(
    `Start test environment`,
    `Failed to start test environment`,
    `Warnings starting test environment`,
    async _spinner => {
      // Bring up the test environment
      await compose.upAll({
        cwd: path.join(tempdir, 'compose'),
      });
    },
  );

const waitForTestEnvironment = async ({
  skipWaitForEthereum,
  skipWaitForIpfs,
  skipWaitForPostgres,
  timeout,
}: {
  skipWaitForEthereum: boolean;
  skipWaitForIpfs: boolean;
  skipWaitForPostgres: boolean;
  timeout: number;
}) =>
  await withSpinner(
    `Wait for test environment`,
    `Failed to wait for test environment`,
    `Warnings waiting for test environment`,
    async spinner => {
      // Wait 10s for IPFS (if desired)
      if (skipWaitForIpfs) {
        step(spinner, 'Skip waiting for IPFS');
      } else {
        await waitFor(
          timeout,
          async () =>
            new Promise((resolve, reject) => {
              http
                .get('http://localhost:15001/api/v0/version', () => {
                  resolve();
                })
                .on('error', e => {
                  reject(new Error(`Could not connect to IPFS: ${e}`));
                });
            }),
        );
        step(spinner, 'IPFS is up');
      }

      // Wait 10s for Ethereum (if desired)
      if (skipWaitForEthereum) {
        step(spinner, 'Skip waiting for Ethereum');
      } else {
        await waitFor(
          timeout,
          async () =>
            new Promise((resolve, reject) => {
              http
                .get('http://localhost:18545', () => {
                  resolve();
                })
                .on('error', e => {
                  reject(new Error(`Could not connect to Ethereum: ${e}`));
                });
            }),
        );
        step(spinner, 'Ethereum is up');
      }

      // Wait 10s for Postgres (if desired)
      if (skipWaitForPostgres) {
        step(spinner, 'Skip waiting for Postgres');
      } else {
        await waitFor(
          timeout,
          async () =>
            new Promise((resolve, reject) => {
              try {
                const socket = net.connect(15_432, 'localhost', () => resolve());
                socket.on('error', e => reject(new Error(`Could not connect to Postgres: ${e}`)));
                socket.end();
              } catch (e) {
                reject(new Error(`Could not connect to Postgres: ${e}`));
              }
            }),
        );
        step(spinner, 'Postgres is up');
      }
    },
  );

const stopTestEnvironment = async (tempdir: string) =>
  await withSpinner(
    `Stop test environment`,
    `Failed to stop test environment`,
    `Warnings stopping test environment`,
    async () => {
      // Our containers do not respond quickly to the SIGTERM which `down` tries before timing out
      // and killing them, so speed things up by sending a SIGKILL right away.
      try {
        await compose.kill({ cwd: path.join(tempdir, 'compose') });
      } catch (e) {
        // Do nothing, we will just try to run 'down'
        // to bring down the environment
      }
      await compose.down({ cwd: path.join(tempdir, 'compose') });
    },
  );

const startGraphNode = async (
  standaloneNode: string,
  standaloneNodeArgs: string | undefined,
  nodeOutputChunks: Buffer[],
): Promise<ChildProcess> =>
  await withSpinner(
    `Start Graph node`,
    `Failed to start Graph node`,
    `Warnings starting Graph node`,
    async spinner => {
      const defaultArgs = [
        '--ipfs',
        'localhost:15001',
        '--postgres-url',
        'postgresql://graph:let-me-in@localhost:15432/graph',
        '--ethereum-rpc',
        'test:http://localhost:18545',
        '--http-port',
        '18000',
        '--ws-port',
        '18001',
        '--admin-port',
        '18020',
        '--index-node-port',
        '18030',
        '--metrics-port',
        '18040',
      ];

      const defaultEnv = {
        GRAPH_LOG: 'debug',
        GRAPH_MAX_API_VERSION: '0.0.5',
      };

      const args = standaloneNodeArgs ? standaloneNodeArgs.split(' ') : defaultArgs;
      const env = { ...defaultEnv, ...process.env };

      const nodeProcess = spawn(standaloneNode, args, {
        cwd: process.cwd(),
        env,
      });

      step(spinner, 'Graph node:', String(nodeProcess.spawnargs.join(' ')));

      nodeProcess.stdout.on('data', data => nodeOutputChunks.push(Buffer.from(data)));
      nodeProcess.stderr.on('data', data => nodeOutputChunks.push(Buffer.from(data)));
      nodeProcess.on('error', e => {
        nodeOutputChunks.push(Buffer.from(String(e), 'utf-8'));
      });

      // Return the node child process
      return nodeProcess;
    },
  );

const waitForGraphNode = async (timeout: number) =>
  await withSpinner(
    `Wait for Graph node`,
    `Failed to wait for Graph node`,
    `Warnings waiting for Graph node`,
    async () => {
      await waitFor(
        timeout,
        async () =>
          new Promise<void>((resolve, reject) => {
            http
              .get('http://localhost:18000', { timeout }, () => resolve())
              .on('error', e => reject(e));
          }),
      );
    },
  );

const stopGraphNode = async (nodeProcess: ChildProcess) =>
  await withSpinner(
    `Stop Graph node`,
    `Failed to stop Graph node`,
    `Warnings stopping Graph node`,
    async () => {
      nodeProcess.kill(9);
    },
  );

const collectGraphNodeLogs = async (
  tempdir: string,
  standaloneNode: string | undefined,
  nodeOutputChunks: Buffer[],
) => {
  if (standaloneNode) {
    // Pull the logs from the captured output
    return stripAnsi(Buffer.concat(nodeOutputChunks).toString('utf-8'));
  }
  // Pull the logs from docker compose
  const logs = await compose.logs('graph-node', {
    follow: false,
    cwd: path.join(tempdir, 'compose'),
  });
  return stripAnsi(logs.out.trim()).replace(/graph-node_1 {2}\| /g, '');
};

const collectEthereumLogs = async (tempdir: string) => {
  const logs = await compose.logs('ethereum', {
    follow: false,
    cwd: path.join(tempdir, 'compose'),
  });
  return stripAnsi(logs.out.trim()).replace(/ethereum_1 {2}\| /g, '');
};

const runTests = async (testCommand: string) =>
  await withSpinner(
    `Run tests`,
    `Failed to run tests`,
    `Warnings running tests`,
    async () =>
      new Promise(resolve => {
        const output: Buffer[] = [];
        const testProcess = spawn(String(testCommand), { shell: true });
        testProcess.stdout.on('data', data => output.push(Buffer.from(data)));
        testProcess.stderr.on('data', data => output.push(Buffer.from(data)));
        testProcess.on('close', code => {
          resolve({
            exitCode: code,
            output: Buffer.concat(output).toString('utf-8'),
          });
        });
      }),
  );
