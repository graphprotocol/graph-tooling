import fs from 'fs';
import process from 'process';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

// Changes the process cwd to the passed directory.
// Executes the code in the passed function.
// Changes the process cwd back to the root folder
// Returns the result of the passed function.
export const fromDirectory = async (
  hre: HardhatRuntimeEnvironment,
  directory: string,
  fn: () => Promise<boolean>,
): Promise<boolean> => {
  if (fs.existsSync(directory)) {
    process.chdir(directory);
  }

  const result = await fn();

  process.chdir(hre.config.paths.root);

  return result;
};
