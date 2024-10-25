import path from 'path';
import { URL } from 'url';
import { print } from 'gluegun';
import { create } from 'ipfs-http-client';
import { Args, Command, Flags, ux } from '@oclif/core';
import { identifyDeployKey } from '../command-helpers/auth';
import { appendApiVersionForGraph, createCompiler } from '../command-helpers/compiler';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs';
import { createJsonRpcClient } from '../command-helpers/jsonrpc';
import { updateSubgraphNetwork } from '../command-helpers/network';
import { chooseNodeUrl } from '../command-helpers/node';
import { assertGraphTsVersion, assertManifestApiVersion } from '../command-helpers/version';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';
import debugFactory from '../debug';
import Protocol from '../protocols';

const headersFlag = Flags.custom<Record<string, string>>({
  summary: 'Add custom headers that will be used by the IPFS HTTP client.',
  aliases: ['hdr'],
  parse: val => JSON.parse(val),
  default: {},
});

const deployDebugger = debugFactory('graph-cli:deploy');

export default class DeployCommand extends Command {
  static description = 'Deploys a subgraph to a Graph node.';

  static args = {
    'subgraph-name': Args.string({}),
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
    node: Flags.string({
      summary: 'Graph node for which to initialize.',
      char: 'g',
    }),
    'deploy-key': Flags.string({
      summary: 'User deploy key.',
      exclusive: ['access-token'],
    }),
    'access-token': Flags.string({
      exclusive: ['deploy-key'],
      deprecated: {
        to: 'deploy-key',
        message: "In next version, we are removing this flag in favor of '--deploy-key'",
      },
    }),
    'version-label': Flags.string({
      summary: 'Version label used for the deployment.',
      char: 'l',
    }),
    ipfs: Flags.string({
      summary: 'Upload build results to an IPFS node.',
      char: 'i',
      default: DEFAULT_IPFS_URL,
    }),
    'ipfs-hash': Flags.string({
      summary: 'IPFS hash of the subgraph manifest to deploy.',
      required: false,
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
    'network-file': Flags.file({
      summary: 'Networks config file path.',
      default: 'networks.json',
    }),
  };

  async run() {
    const {
      args: { 'subgraph-name': subgraphNameArg, 'subgraph-manifest': manifest },
      flags: {
        'deploy-key': deployKeyFlag,
        'access-token': accessToken,
        'version-label': versionLabelFlag,
        ipfs,
        headers,
        node: nodeFlag,
        'output-dir': outputDir,
        'skip-migrations': skipMigrations,
        watch,
        'debug-fork': debugFork,
        network,
        'network-file': networkFile,
        'ipfs-hash': ipfsHash,
      },
    } = await this.parse(DeployCommand);

    const subgraphName =
      subgraphNameArg ||
      (await ux.prompt('What is the subgraph name?', {
        required: true,
      }));

    const { node } = chooseNodeUrl({
      node: nodeFlag,
    });
    if (!node) {
      // shouldn't happen, but we do the check to satisfy TS
      this.error('No Graph node provided');
    }

    const isStudio = node.match(/studio/);

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
      client.options.headers = {
        ...GRAPH_CLI_SHARED_HEADERS,
        Authorization: 'Bearer ' + deployKey,
      };
    }

    // Ask for label if not on hosted service
    let versionLabel = versionLabelFlag;
    versionLabel ||= await ux.prompt('Which version label to use? (e.g. "v0.0.1")', {
      required: true,
    });

    const deploySubgraph = async (ipfsHash: string) => {
      const spinner = print.spin(`Deploying to Graph node ${requestUrl}`);
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
          deployDebugger('requestError: %O', requestError);
          deployDebugger('jsonRpcError: %O', jsonRpcError);
          if (jsonRpcError) {
            const message = jsonRpcError?.message || jsonRpcError?.code?.toString();
            deployDebugger('message: %O', message);
            let errorMessage = `Failed to deploy to Graph node ${requestUrl}: ${message}`;

            if (message?.match(/auth failure/)) {
              errorMessage += '\nYou may need to authenticate first.';
            }
            spinner.fail(errorMessage);
            this.exit(1);
          } else if (requestError) {
            spinner.fail(`HTTP error deploying the subgraph ${requestError.code}`);
            this.exit(1);
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

            print.success(`Deployed to ${playground}`);
            print.info('\nSubgraph endpoints:');
            print.info(`Queries (HTTP):     ${queries}`);
            print.info(``);
            process.exit(0);
          }
        },
      );
    };

    // we are provided the IPFS hash, so we deploy directly
    if (ipfsHash) {
      // Connect to the IPFS node (if a node address was provided)
      const ipfsClient = create({
        url: appendApiVersionForGraph(ipfs.toString()),
        headers: {
          ...headers,
          ...GRAPH_CLI_SHARED_HEADERS,
        },
      });

      // Fetch the manifest from IPFS
      const manifestBuffer = ipfsClient.cat(ipfsHash);
      let manifestFile = '';
      for await (const chunk of manifestBuffer) {
        manifestFile += chunk.toString();
      }

      if (!manifestFile) {
        this.error(`Could not find subgraph manifest at IPFS hash ${ipfsHash}`, { exit: 1 });
      }

      await ipfsClient.pin.add(ipfsHash);

      await deploySubgraph(ipfsHash);
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

    const compiler = createCompiler(manifest, {
      ipfs,
      headers,
      outputDir,
      outputFormat: 'wasm',
      skipMigrations,
      blockIpfsMethods: undefined,
      protocol,
    });

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      this.exit(1);
      return;
    }

    if (watch) {
      await compiler.watchAndCompile(async ipfsHash => {
        if (ipfsHash !== undefined) {
          await deploySubgraph(ipfsHash);
        }
      });
    } else {
      const result = await compiler.compile({ validate: true });
      if (result === undefined || result === false) {
        // Compilation failed, not deploying.
        process.exitCode = 1;
        return;
      }
      await deploySubgraph(result);
    }
  }
}
