import { URL } from 'url';
import { print } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import { Deprecation } from '@oclif/core/lib/interfaces';
import { identifyDeployKey as identifyAccessToken } from '../command-helpers/auth';
import { createJsonRpcClient } from '../command-helpers/jsonrpc';
import { validateNodeUrl } from '../command-helpers/node';
import { GRAPH_CLI_SHARED_HEADERS } from '../constants';

export default class CreateCommand extends Command {
  static description = 'Registers a subgraph name';
  static state = 'deprecated';
  static deprecationOptions: Deprecation = {
    message:
      'In next major version, this command will be merged as a subcommand for `graph local`.',
  };

  static args = {
    'subgraph-name': Args.string({
      required: true,
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),

    node: Flags.string({
      summary: 'Graph node to create the subgraph in.',
      char: 'g',
      required: true,
    }),
    'access-token': Flags.string({
      summary: 'Graph access token.',
    }),
  };

  async run() {
    const {
      args: { 'subgraph-name': subgraphName },
      flags: { 'access-token': accessTokenFlag, node },
    } = await this.parse(CreateCommand);

    try {
      validateNodeUrl(node);
    } catch (e) {
      this.error(`Graph node "${node}" is invalid: ${e.message}`, { exit: 1 });
    }

    const requestUrl = new URL(node);
    const client = createJsonRpcClient(requestUrl);

    // Exit with an error code if the client couldn't be created
    if (!client) {
      this.exit(1);
      return;
    }

    // Use the access token, if one is set
    const accessToken = await identifyAccessToken(node, accessTokenFlag);
    if (accessToken !== undefined && accessToken !== null) {
      // @ts-expect-error options property seems to exist
      client.options.headers = {
        ...GRAPH_CLI_SHARED_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      };
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
          this.exit(1);
        } else if (requestError) {
          spinner.fail(`HTTP error creating the subgraph: ${requestError.code}`);
          this.exit(1);
        } else {
          spinner.stop();
          print.success(`Created subgraph: ${subgraphName}`);
        }
      },
    );
  }
}
