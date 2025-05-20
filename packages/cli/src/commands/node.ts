import * as fs from 'node:fs';
import { chmod } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { print } from 'gluegun';
import ProgressBar from 'progress';
import { Args, Command, Flags } from '@oclif/core';
import {
  downloadGraphNodeRelease,
  extractGz,
  extractZipAndGetExe,
  getLatestGraphNodeRelease,
  moveFileToBinDir,
} from '../command-helpers/local-node.js';

export default class NodeCommand extends Command {
  static description = 'Manage Graph node related operations';

  static override flags = {
    help: Flags.help({
      char: 'h',
    }),
    tag: Flags.string({
      summary: 'Tag of the Graph Node release to install.',
    }),
    'download-dir': Flags.string({
      summary: 'Directory to download the Graph Node release to.',
      default: os.tmpdir(),
    }),
  };

  static override args = {
    install: Args.boolean({
      description: 'Install the Graph Node',
    }),
  };

  static examples = ['$ graph node install'];

  static strict = false;

  async run() {
    const { flags, args } = await this.parse(NodeCommand);

    if (args.install) {
      await installGraphNode(flags.tag);
      return;
    }

    // If no valid subcommand is provided, show help
    await this.config.runCommand('help', ['node']);
  }
}

async function installGraphNode(tag?: string) {
  const latestRelease = tag || (await getLatestGraphNodeRelease());
  const tmpBase = os.tmpdir();
  const tmpDir = await fs.promises.mkdtemp(path.join(tmpBase, 'graph-node-'));
  let progressBar: ProgressBar | undefined;

  let downloadPath: string;
  try {
    downloadPath = await downloadGraphNodeRelease(latestRelease, tmpDir, (downloaded, total) => {
      if (!total) return;

      progressBar ||= new ProgressBar(`Downloading ${latestRelease} [:bar] :percent`, {
        width: 30,
        total,
        complete: '=',
        incomplete: ' ',
      });

      progressBar.tick(downloaded - (progressBar.curr || 0));
    });
  } catch (e) {
    print.error(e);
    throw e;
  }

  let extractedPath: string;

  print.info(`Extracting ${downloadPath}`);
  if (downloadPath.endsWith('.gz')) {
    extractedPath = await extractGz(downloadPath);
  } else if (downloadPath.endsWith('.zip')) {
    extractedPath = await extractZipAndGetExe(downloadPath, tmpDir);
  } else {
    print.error(`Unsupported file type: ${downloadPath}`);
    throw new Error(`Unsupported file type: ${downloadPath}`);
  }

  const movedPath = await moveFileToBinDir(extractedPath);
  print.info(`Moved ${extractedPath} to ${movedPath}`);

  if (os.platform() !== 'win32') {
    await chmod(movedPath, 0o755);
  }

  print.info(`Installed Graph Node ${latestRelease}`);
  print.info(
    `Please add the following to your PATH: ${path.dirname(movedPath)} if it's not already there or if you're using a custom download directory`,
  );

  // Delete the temporary directory
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
}
