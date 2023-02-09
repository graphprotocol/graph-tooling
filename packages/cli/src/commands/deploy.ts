import path from 'path';
import { URL } from 'url';
import chalk from 'chalk';
import { GluegunToolbox } from 'gluegun';
import { identifyDeployKey } from '../command-helpers/auth';
import { createCompiler } from '../command-helpers/compiler';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { fixParameters } from '../command-helpers/gluegun';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs';
import { createJsonRpcClient } from '../command-helpers/jsonrpc';
import { updateSubgraphNetwork } from '../command-helpers/network';
import { chooseNodeUrl } from '../command-helpers/node';
import { validateStudioNetwork } from '../command-helpers/studio';
import { assertGraphTsVersion, assertManifestApiVersion } from '../command-helpers/version';
import Protocol from '../protocols';
import { Args, Command, Flags } from '@oclif/core';

const headersFlag = Flags.custom<Record<string, string>>({
  summary: 'Add custom headers that will be used by the IPFS HTTP client.',
  aliases: ['hdr'],
  parse: val => JSON.parse(val),
  default: {},
});

export default class DeployCommand extends Command {
  static description = 'Deploys a subgraph to a Graph node.';

  static args = {
    'subgraph-name': Args.string({
      required: true,
    }),
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    product: Flags.string({
      summary: 'Select a product for which to authenticate.',
      options: ['subgraph-studio', 'hosted-service'],
    }),
    studio: Flags.boolean({
      summary: 'Shortcut for "--product subgraph-studio".',
      exclusive: ['product'],
    }),
    node: Flags.string({
      summary: 'Graph node for which to initialize.',
      char: 'g',
      required: true,
    }),
    'deploy-key': Flags.string({
      summary: 'User deploy key.',
      required: true,
      exclusive: ['access-token'],
    }),
    'access-token': Flags.string({
      deprecated: true,
      summary: 'Graph access key. DEPRECATED: Use "--deploy-key" instead.',
      exclusive: ['deploy-key'],
    }),
    'version-label': Flags.string({
      summary: 'Version label used for the deployment.',
      char: 'l',
    }),
    ipfs: Flags.string({
      summary: 'Upload build results to an IPFS node.',
      char: 'i',
      required: true, // TODO: do we need? will be optional if env is set?
      env: 'DEFAULT_IPFS_URL',
    }),
    headers: headersFlag(),
    'debug-fork': Flags.string({
      summary: 'ID of a remote subgraph whose store will be GraphQL queried.',
    }),
    'output-dir': Flags.directory({
      summary: 'Output directory for build results.',
      char: 'o',
      default: 'build/',
    }),
    'skip-migrations': Flags.boolean({
      summary: 'Skip subgraph migrations.',
    }),
    watch: Flags.boolean({
      summary: 'Regenerate types when subgraph files change.',
      char: 'w',
    }),
    network: Flags.string({
      summary: 'Network configuration to use from the networks config file.',
    }),
    // TODO: should be networksFile (with an "s"), or?
    'network-file': Flags.file({
      summary: 'Networks config file path.',
      default: 'networks.json',
    }),
  };

  async run() {
    const {
      args: { 'subgraph-name': subgraphName, 'subgraph-manifest': manifest },
      flags: {
        product,
        studio,
        'deploy-key': deployKeyFlag,
        'access-token': accessToken,
        'version-label': versionLabel,
        ipfs,
        headers,
        node,
        'output-dir': outputDir,
        'skip-migrations': skipMigrations,
        watch,
        'debug-fork': debugFork,
        network,
        'network-file': networkFile,
      },
    } = await this.parse(DeployCommand);

    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);

      for (const { network } of dataSourcesAndTemplates) {
        validateStudioNetwork({ studio, product, network });
      }
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    ({ node } = chooseNodeUrl({ product, studio, node }));
    if (!node) {
      const inputs = await processForm(toolbox, {
        product,
        studio,
        node,
        versionLabel: 'skip', // determine label requirement later
      });
      if (inputs === undefined) {
        process.exit(1);
      }
      product = inputs.product;
      ({ node } = chooseNodeUrl({
        product,
        studio,
        node,
      }));
    }

    // Validate the subgraph name
    if (!subgraphName) {
      this.error(
        `No subgraph ${product == 'subgraph-studio' || studio ? 'slug' : 'name'} provided`,
        { exit: 1 },
      );
    }

    // Validate node
    if (!node) {
      print.error(`No Graph node provided`);
      print.info(HELP);
      process.exitCode = 1;
      return;
    }

    let protocol;
    try {
      // Checks to make sure deploy doesn't run against
      // older subgraphs (both apiVersion and graph-ts version).
      //
      // We don't want the deploy to run without these conditions
      // because that would mean the CLI would try to compile code
      // using the wrong AssemblyScript compiler.
      await assertManifestApiVersion(manifest, '0.0.5');
      await assertGraphTsVersion(path.dirname(manifest), '0.25.0');

      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);

      protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    if (network) {
      const identifierName = protocol.getContract()!.identifierName();
      await updateSubgraphNetwork(manifest, network, networkFile, identifierName);
    }

    const isStudio = node.match(/studio/);
    const isHostedService = node.match(/thegraph.com/) && !isStudio;

    const compiler = createCompiler(manifest, {
      ipfs,
      headers,
      outputDir,
      outputFormat: 'wasm',
      skipMigrations,
      blockIpfsMethods: isStudio || undefined, // Network does not support publishing subgraphs with IPFS methods
      protocol,
    });

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      this.exit(1);
      return;
    }

    // Ask for label if not on hosted service
    if (!versionLabel && !isHostedService) {
      const inputs = await processForm(toolbox, {
        product,
        studio,
        node,
        versionLabel,
      });
      if (inputs === undefined) {
        process.exit(1);
      }
      versionLabel = inputs.versionLabel;
    }

    const requestUrl = new URL(node);
    const client = createJsonRpcClient(requestUrl);

    // Exit with an error code if the client couldn't be created
    if (!client) {
      this.exit(1);
      return;
    }

    // Use the deploy key, if one is set
    let deployKey = deployKeyFlag;
    if (!deployKey && accessToken) {
      deployKey = accessToken; // backwards compatibility
    }
    deployKey = await identifyDeployKey(node, deployKey);
    if (deployKey !== undefined && deployKey !== null) {
      // @ts-expect-error options property seems to exist
      client.options.headers = { Authorization: 'Bearer ' + deployKey };
    }

    const deploySubgraph = async (ipfsHash: string) => {
      const spinner = print.spin(`Deploying to Graph node ${requestUrl}`);
      //       `Failed to deploy to Graph node ${requestUrl}`,
      client.request(
        'subgraph_deploy',
        {
          name: subgraphName,
          ipfs_hash: ipfsHash,
          version_label: versionLabel,
          debug_fork: debugFork,
        },
        async (
          // @ts-expect-error TODO: why are the arguments not typed?
          requestError,
          // @ts-expect-error TODO: why are the arguments not typed?
          jsonRpcError,
          // @ts-expect-error TODO: why are the arguments not typed?
          res,
        ) => {
          if (jsonRpcError) {
            spinner.fail(`Failed to deploy to Graph node ${requestUrl}: ${jsonRpcError.message}`);

            // Provide helpful advice when the subgraph has not been created yet
            if (jsonRpcError.message.match(/subgraph name not found/)) {
              if (isHostedService) {
                print.info(`
You may need to create it at https://thegraph.com/explorer/dashboard.`);
              } else {
                print.info(`
Make sure to create the subgraph first by running the following command:
$ graph create --node ${node} ${subgraphName}`);
              }
            }
            process.exitCode = 1;
          } else if (requestError) {
            spinner.fail(`HTTP error deploying the subgraph ${requestError.code}`);
            process.exitCode = 1;
          } else {
            spinner.stop();

            const base = requestUrl.protocol + '//' + requestUrl.hostname;
            let playground = res.playground;
            let queries = res.queries;

            // Add a base URL if graph-node did not return the full URL
            if (playground.charAt(0) === ':') {
              playground = base + playground;
            }
            if (queries.charAt(0) === ':') {
              queries = base + queries;
            }

            if (isHostedService) {
              print.success(
                `Deployed to ${chalk.blue(
                  `https://thegraph.com/explorer/subgraph/${subgraphName}`,
                )}`,
              );
            } else {
              print.success(`Deployed to ${chalk.blue(String(playground))}`);
            }
            print.info('\nSubgraph endpoints:');
            print.info(`Queries (HTTP):     ${queries}`);
            print.info(``);
          }
        },
      );
    };

    if (watch) {
      await compiler.watchAndCompile(async ipfsHash => {
        if (ipfsHash !== undefined) {
          await deploySubgraph(ipfsHash);
        }
      });
    } else {
      const result = await compiler.compile();
      if (result === undefined || result === false) {
        // Compilation failed, not deploying.
        process.exitCode = 1;
        return;
      }
      await deploySubgraph(result);
    }
  }
}

export interface DeployOptions {
  product?: 'subgraph-studio' | 'hosted-service';
  studio?: boolean;
  node?: string;
  deployKey?: string;
  versionLabel?: string;
  help?: boolean;
  ipfs?: string;
  headers?: Record<string, string>;
  debugFork?: boolean;
  outputDir?: string;
  skipMigrations?: boolean;
  watch?: boolean;
  network?: string;
  networkFile?: string;
}

const processForm = async (
  toolbox: GluegunToolbox,
  { product, studio, node, versionLabel }: DeployOptions,
) => {
  const questions = [
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to deploy',
      choices: ['subgraph-studio', 'hosted-service'],
      skip:
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined ||
        node !== undefined,
    },
    {
      type: 'input',
      name: 'versionLabel',
      message: 'Version Label (e.g. v0.0.1)',
      skip: versionLabel !== undefined,
    },
  ];

  try {
    const answers = await toolbox.prompt.ask(questions);
    return answers;
  } catch (e) {
    return undefined;
  }
};
