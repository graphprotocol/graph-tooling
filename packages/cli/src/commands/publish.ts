import chalk from 'chalk';
import { print } from 'gluegun';
import open from 'open';
import { Args, Command, Flags, ux } from '@oclif/core';
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
  async publishWithBrowser({ ipfsHash, webapp }: { ipfsHash: string, webapp: string }) {
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

    const URL = `${webapp}?id=${ipfsHash}`;

    print.success(
      `Finalize the publish of the subgraph from the Graph CLI publish page. Opening up the browser to continue publishing at ${URL}`,
    );
    await open(URL);
    return;
  }

  async run() {
    const {
      args: { 'subgraph-manifest': manifest },
      flags: {
        'ipfs-hash': ipfsHash,
        'webapp-url': webUiUrl,
        ipfs,
      },
    } = await this.parse(PublishCommand);

    if (ipfsHash) {
      await this.publishWithBrowser({ ipfsHash, webapp: webUiUrl });
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

    await this.publishWithBrowser({ ipfsHash: result, webapp: webUiUrl });
    return;
  }
}
