import { print, prompt } from 'gluegun';
import { Args, Command, Flags } from '@oclif/core';
import { saveDeployKey } from '../command-helpers/auth.js';
import { chooseNodeUrl } from '../command-helpers/node.js';

export default class AuthCommand extends Command {
  static description = 'Sets the deploy key to use when deploying to a Graph node.';

  static args = {
    'deploy-key': Args.string(),
  };

  static flags = {
    help: Flags.help({
      char: 'h',
    }),
  };

  private validateStudioDeployKey(value: string | undefined): boolean {
    if (!value) return false;
    return /^[0-9a-fA-F]{32}$/.test(value);
  }

  async run() {
    const {
      args: { 'deploy-key': initialDeployKey },
    } = await this.parse(AuthCommand);

    const { node } = chooseNodeUrl({});

    const { deployKey } = await prompt.ask<{ deployKey: string }>([
      {
        type: 'input',
        name: 'deployKey',
        message: () => 'What is your Subgraph Studio deploy key?',
        required: true,
        initial: initialDeployKey,
        skip: this.validateStudioDeployKey(initialDeployKey),
        validate: value =>
          this.validateStudioDeployKey(value) || `Invalid Subgraph Studio deploy key: ${value}`,
      },
    ]);

    try {
      await saveDeployKey(node!, deployKey);
      print.success(`Deploy key set for ${node}`);
    } catch (e) {
      this.error(`Failed to set deploy key: ${e.message}`, { exit: 1 });
    }
  }
}
