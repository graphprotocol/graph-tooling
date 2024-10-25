import chalk from 'chalk';
import { print } from 'gluegun';
import open from 'open';
import { Args, Command, Flags, ux } from '@oclif/core';
// eslint-disable-next-line no-restricted-imports
import { URL, URLSearchParams } from '@whatwg-node/fetch';
import { createCompiler } from '../command-helpers/compiler';
import * as DataSourcesExtractor from '../command-helpers/data-sources';
import { DEFAULT_IPFS_URL } from '../command-helpers/ipfs';
import Protocol from '../protocols';

export default class PublishCommand extends Command {
  static description = 'Publish to the Graph Network';

  static args = {
    'subgraph-manifest': Args.string({
      default: 'subgraph.yaml',
    }),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
    'subgraph-id': Flags.string({
      summary: 'Subgraph ID to publish to.',
      required: false,
    }),
    'protocol-network': Flags.string({
      summary: 'The network to use for the subgraph deployment.',
      options: ['arbitrum-one', 'arbitrum-sepolia'],
      default: 'arbitrum-one',
      required: false,
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
    'webapp-url': Flags.string({
      summary: 'URL of the web UI you want to use to deploy.',
      required: false,
      default: 'https://cli.thegraph.com/publish',
    }),
  };

  /**
   * Prompt the user to open up the browser to continue publishing the subgraph
   */
  async publishWithBrowser({
    ipfsHash,
    webapp,
    subgraphId,
    protocolNetwork,
  }: {
    ipfsHash: string;
    webapp: string;
    subgraphId: string | undefined;
    protocolNetwork: string | undefined;
  }) {
    const answer = await ux.prompt(
      `Press ${chalk.green(
        'y',
      )} (or any key) to open up the browser to continue publishing or ${chalk.yellow(
        'q',
      )} to exit`,
    );

    if (answer.toLowerCase() === 'q') {
      this.exit(0);
    }

    const url = new URL(webapp);

    const searchParams = new URLSearchParams(url.search);
    searchParams.set('id', ipfsHash);
    if (subgraphId) {
      searchParams.set('subgraphId', subgraphId);
    }
    if (protocolNetwork) {
      searchParams.set('network', protocolNetwork);
    }

    url.search = searchParams.toString();

    const openUrl = url.toString();

    print.success(
      `Finalize the publish of the subgraph from the Graph CLI publish page. Opening up the browser to continue publishing at ${openUrl}`,
    );
    await open(openUrl);
    return;
  }

  async run() {
    const {
      args: { 'subgraph-manifest': manifest },
      flags: {
        'ipfs-hash': ipfsHash,
        'webapp-url': webUiUrl,
        ipfs,
        'subgraph-id': subgraphId,
        'protocol-network': protocolNetwork,
      },
    } = await this.parse(PublishCommand);

    if (ipfsHash) {
      await this.publishWithBrowser({ ipfsHash, webapp: webUiUrl, subgraphId, protocolNetwork });
      return;
    }

    let protocol;
    try {
      const dataSourcesAndTemplates = await DataSourcesExtractor.fromFilePath(manifest);
      protocol = Protocol.fromDataSources(dataSourcesAndTemplates);
    } catch (e) {
      this.error(e, { exit: 1 });
    }

    const compiler = createCompiler(manifest, {
      ipfs,
      outputDir: 'build/',
      outputFormat: 'wasm',
      skipMigrations: false,
      protocol,
    });

    // Exit with an error code if the compiler couldn't be created
    if (!compiler) {
      this.exit(1);
      return;
    }
    const result = await compiler.compile({ validate: true });
    if (result === undefined || result === false) {
      // Compilation failed, not deploying.
      process.exitCode = 1;
      return;
    }

    await this.publishWithBrowser({
      ipfsHash: result,
      webapp: webUiUrl,
      subgraphId,
      protocolNetwork,
    });
    return;
  }
}
