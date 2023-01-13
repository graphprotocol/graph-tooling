import { URL } from 'url';
import chalk from 'chalk';
import { GluegunToolbox } from 'gluegun';
import { identifyDeployKey as identifyAccessToken } from '../command-helpers/auth';
import { createJsonRpcClient } from '../command-helpers/jsonrpc';
import { validateNodeUrl } from '../command-helpers/node';

const HELP = `
${chalk.bold('graph create')} ${chalk.dim('[options]')} ${chalk.bold('<subgraph-name>')}

${chalk.dim('Options:')}

      --access-token <token>    Graph access token
  -h, --help                    Show usage information
  -g, --node <url>              Graph node to create the subgraph in
`;

export interface CreateOptions {
  accessToken?: string;
  help?: boolean;
  node?: string;
}

export default {
  description: 'Registers a subgraph name',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { print } = toolbox;

    // Read CLI parameters
    let { accessToken, g, h, help, node } = toolbox.parameters.options;
    const subgraphName = toolbox.parameters.first;

    // Support both long and short option variants
    node ||= g;
    help ||= h;

    // Show help text if requested
    if (help) {
      print.info(HELP);
      return;
    }

    // Validate the subgraph name
    if (!subgraphName) {
      print.error('No subgraph name provided');
      print.info(HELP);
      process.exitCode = 1;
      return;
    }

    // Validate node
    if (!node) {
      print.error(`No Graph node provided`);
      print.info(HELP);
      process.exitCode = 1;
      return;
    }
    try {
      validateNodeUrl(node);
    } catch (e) {
      print.error(`Graph node "${node}" is invalid: ${e.message}`);
      process.exitCode = 1;
      return;
    }

    const requestUrl = new URL(node);
    const client = createJsonRpcClient(requestUrl);

    // Exit with an error code if the client couldn't be created
    if (!client) {
      process.exitCode = 1;
      return;
    }

    // Use the access token, if one is set
    accessToken = await identifyAccessToken(node, accessToken);
    if (accessToken !== undefined && accessToken !== null) {
      // @ts-expect-error options property seems to exist
      client.options.headers = { Authorization: `Bearer ${accessToken}` };
    }

    const spinner = print.spin(`Creating subgraph in Graph node: ${requestUrl}`);
    client.request(
      'subgraph_create',
      { name: subgraphName },
      (
        // @ts-expect-error TODO: why are the arguments not typed?
        requestError,
        // @ts-expect-error TODO: why are the arguments not typed?
        jsonRpcError,
        // TODO: this argument is unused, but removing it fails the basic-event-handlers tests
        // @ts-expect-error TODO: why are the arguments not typed?
        _res,
      ) => {
        if (jsonRpcError) {
          spinner.fail(`Error creating the subgraph: ${jsonRpcError.message}`);
          process.exitCode = 1;
        } else if (requestError) {
          spinner.fail(`HTTP error creating the subgraph: ${requestError.code}`);
          process.exitCode = 1;
        } else {
          spinner.stop();
          print.success(`Created subgraph: ${subgraphName}`);
        }
      },
    );
  },
};
