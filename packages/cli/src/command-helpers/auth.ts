import fs from 'fs';
import os from 'os';
import path from 'path';
import * as toolbox from 'gluegun';
import { normalizeNodeUrl } from './node';

const homedir = os.homedir();

const CONFIG_PATH = path.join(homedir, '/.graph-cli.json');
const getConfig = () => {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH).toString());
  } catch {
    config = {};
  }
  return config;
};

export const identifyDeployKey = async (node: string, deployKey: string | undefined) => {
  // Determine the deploy key to use, if any:
  // - First try using --deploy-key, if provided
  // - Then see if we have a deploy key set for the Graph node
  if (deployKey !== undefined) {
    return deployKey;
  }
  try {
    node = normalizeNodeUrl(node);
    const config = getConfig();
    return config[node];
  } catch (e) {
    toolbox.print.warning(`Could not get deploy key: ${e.message}`);
    toolbox.print.info(`Continuing without a deploy key\n`);
  }
};

export const saveDeployKey = async (node: string, deployKey: string) => {
  try {
    node = normalizeNodeUrl(node);
    const config = getConfig();
    config[node] = deployKey;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
  } catch (e) {
    throw new Error(`Error storing deploy key: ${e.message}`);
  }
};
