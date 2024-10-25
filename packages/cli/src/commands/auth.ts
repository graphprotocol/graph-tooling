import { print } from 'gluegun';
import { Args, Command, Flags, ux } from '@oclif/core';
import { saveDeployKey } from '../command-helpers/auth';
import { chooseNodeUrl } from '../command-helpers/node';

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

  async run() {
    let {
      args: { 'deploy-key': deployKey },
    } = await this.parse(AuthCommand);

    const { node } = chooseNodeUrl({});

    // eslint-disable-next-line -- prettier has problems with ||=
    deployKey =
      deployKey ||
      (await ux.prompt('What is the deploy key?', {
        required: true,
        type: 'mask',
      }));
    if (deployKey.length > 200) {
      this.error('✖ Deploy key must not exceed 200 characters', { exit: 1 });
    }

    if (product === 'hosted-service' || node?.match(/api.thegraph.com/)) {
      this.error('✖ The hosted service is deprecated', { exit: 1 });
    }

    try {
      await saveDeployKey(node!, deployKey);
      print.success(`Deploy key set for ${node}`);
    } catch (e) {
      this.error(e, { exit: 1 });
    }
  }
}
