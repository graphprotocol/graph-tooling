import * as fs from 'node:fs';
import { chmod } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { print } from 'gluegun';
import ProgressBar from 'progress';
import { Command, Flags } from '@oclif/core';
import {
  downloadGraphNodeRelease,
  extractGz,
  extractZipAndGetExe,
  getLatestGraphNodeRelease,
  moveFileToBinDir,
} from '../command-helpers/local-node.js';

export default class NodeCommand extends Command {
  static description = 'Manage Graph node related operations';

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
  };

  static args = {};

  static examples = ['$ graph node install'];

  static strict = false;

  async run() {
    const { argv } = await this.parse(NodeCommand);

    if (argv.length > 0) {
      const subcommand = argv[0];

      if (subcommand === 'install') {
        await installGraphNode();
      }

      // If no valid subcommand is provided, show help
      await this.config.runCommand('help', ['node']);
    }
  }
}

async function installGraphNode() {
  const latestRelease = await getLatestGraphNodeRelease();
  const tmpBase = os.tmpdir();
  const tmpDir = await fs.promises.mkdtemp(path.join(tmpBase, 'graph-node-'));
  let progressBar: ProgressBar | undefined;
  const downloadPath = await downloadGraphNodeRelease(
    latestRelease,
    tmpDir,
    (downloaded, total) => {
      if (!total) return;

      progressBar ||= new ProgressBar(`Downloading ${latestRelease} [:bar] :percent`, {
        width: 30,
        total,
        complete: '=',
        incomplete: ' ',
      });

      progressBar.tick(downloaded - (progressBar.curr || 0));
    },
  );

  let extractedPath: string;

  if (downloadPath.endsWith('.gz')) {
    extractedPath = await extractGz(downloadPath);
    print.info(`Extracted ${extractedPath}`);
  } else if (downloadPath.endsWith('.zip')) {
    extractedPath = await extractZipAndGetExe(downloadPath, tmpDir);
    print.info(`Extracted ${extractedPath}`);
  } else {
    throw new Error(`Unsupported file type: ${downloadPath}`);
  }

  const movedPath = await moveFileToBinDir(extractedPath);
  print.info(`Moved ${extractedPath} to ${movedPath}`);

  if (os.platform() !== 'win32') {
    await chmod(movedPath, 0o755);
  }

  // Delete the temporary directory
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
}
