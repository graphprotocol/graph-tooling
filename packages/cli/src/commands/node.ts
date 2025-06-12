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
    'bin-dir': Flags.string({
      summary: 'Directory to install the Graph Node binary to.',
    }),
  };

  static override args = {
    install: Args.boolean({
      description: 'Install the Graph Node',
    }),
  };

  static examples = [
    '$ graph node install',
    '$ graph node install --tag v1.0.0',
    '$ graph node install --bin-dir /usr/local/bin',
  ];

  static strict = false;

  async run() {
    const { flags, args } = await this.parse(NodeCommand);

    if (args.install) {
      await installGraphNode(flags.tag, flags['bin-dir']);
      return;
    }

    // If no valid subcommand is provided, show help
    await this.config.runCommand('help', ['node']);
  }
}

async function installGraphNode(tag?: string, binDir?: string) {
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

  print.info(`\nExtracting binary...`);
  if (downloadPath.endsWith('.gz')) {
    extractedPath = await extractGz(downloadPath);
  } else if (downloadPath.endsWith('.zip')) {
    extractedPath = await extractZipAndGetExe(downloadPath, tmpDir);
  } else {
    print.error(`Unsupported file type: ${downloadPath}`);
    throw new Error(`Unsupported file type: ${downloadPath}`);
  }

  const movedPath = await moveFileToBinDir(extractedPath, binDir);
  print.info(`✅ Graph Node ${latestRelease} installed successfully`);
  print.info(`Binary location: ${movedPath}`);

  if (os.platform() !== 'win32') {
    await chmod(movedPath, 0o755);
  }

  print.info('');
  print.info(`📋 Next steps:`);
  print.info(`   Add ${path.dirname(movedPath)} to your PATH (if not already)`);
  print.info(`   Run 'gnd' to start your local Graph Node development environment`);
  print.info('');

  // Delete the temporary directory
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
}
