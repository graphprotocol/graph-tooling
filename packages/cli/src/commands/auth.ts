import chalk from 'chalk';
import { GluegunToolbox } from 'gluegun';
import { saveDeployKey } from '../command-helpers/auth';
import { fixParameters } from '../command-helpers/gluegun';
import { chooseNodeUrl } from '../command-helpers/node';

const HELP = `
${chalk.bold('graph auth')} [options] ${chalk.bold('<node>')} ${chalk.bold('<deploy-key>')}

${chalk.dim('Options:')}

      --product <subgraph-studio|hosted-service>
                                Selects the product for which to authenticate
      --studio                  Shortcut for --product subgraph-studio
  -h, --help                    Show usage information
`;

export interface AuthOptions {
  product?: 'subgraph-studio' | 'hosted-service';
  studio?: boolean;
  help?: boolean;
  // not a cli arg
  node?: string;
  deployKey?: string;
}

const processForm = async (
  toolbox: GluegunToolbox,
  { product, studio, node, deployKey }: AuthOptions,
) => {
  const questions = [
    {
      type: 'select',
      name: 'product',
      message: 'Product for which to initialize',
      choices: ['subgraph-studio', 'hosted-service'],
      skip:
        product === 'subgraph-studio' ||
        product === 'hosted-service' ||
        studio !== undefined ||
        node !== undefined,
    },
    {
      type: 'password',
      name: 'deployKey',
      message: 'Deploy key',
      skip: deployKey !== undefined,
    },
  ];

  try {
    const answers = await toolbox.prompt.ask(questions);
    return answers;
  } catch (e) {
    return undefined;
  }
};

export default {
  description: 'Sets the deploy key to use when deploying to a Graph node',
  run: async (toolbox: GluegunToolbox) => {
    // Obtain tools
    const { print } = toolbox;

    // Read CLI parameters
    const { product, studio, h, help } = toolbox.parameters.options;

    // Show help text if requested
    if (help || h) {
      print.info(HELP);
      return;
    }

    let firstParam: string, secondParam: string;
    try {
      [firstParam, secondParam] = fixParameters(toolbox.parameters, {
        h,
        help,
        studio,
      });
    } catch (e) {
      print.error(e.message);
      process.exitCode = 1;
      return;
    }

    // if user specifies --product or --studio then deployKey is the first parameter
    let node: string | undefined;
    let deployKey;
    if (product || studio) {
      ({ node } = chooseNodeUrl({ product, studio, node }));
      deployKey = firstParam;
    } else {
      node = firstParam;
      deployKey = secondParam;
    }

    if (!node || !deployKey) {
      const inputs = await processForm(toolbox, {
        product,
        studio,
        node,
        deployKey,
      });
      if (inputs === undefined) {
        process.exit(1);
      }
      if (!node) {
        ({ node } = chooseNodeUrl({
          product: inputs.product,
          studio,
          node,
        }));
      }
      deployKey ||= inputs.deployKey;
    }

    if (!deployKey) {
      print.error(`No deploy key provided`);
      print.info(HELP);
      process.exitCode = 1;
      return;
    }
    if (deployKey.length > 200) {
      print.error(`Deploy key must not exceed 200 characters`);
      process.exitCode = 1;
      return;
    }

    try {
      await saveDeployKey(node!, deployKey);
      print.success(`Deploy key set for ${node}`);
    } catch (e) {
      print.error(e);
      process.exitCode = 1;
    }
  },
};
