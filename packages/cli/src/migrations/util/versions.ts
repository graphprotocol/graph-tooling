import path from 'path';
import fs from 'fs-extra';

export async function getGraphTsVersion(sourceDir: string) {
  let graphTsPath!: string;

  for (
    let dir: string | undefined = path.resolve(sourceDir);
    // Terminate after the root dir or when we have found node_modules
    dir !== undefined;
    // Continue with the parent directory, terminate after the root dir
    dir = path.dirname(dir) === dir ? undefined : path.dirname(dir)
  ) {
    const graphTsNodeModulesPath = path.join(dir, 'node_modules', '@graphprotocol', 'graph-ts');

    if (fs.existsSync(graphTsNodeModulesPath)) {
      graphTsPath = graphTsNodeModulesPath;
      // Loop until we find the first occurrence of graph-ts in node_modules
      break;
    }
  }

  const pkgJsonFile = path.join(graphTsPath, 'package.json');
  const data = await fs.readFile(pkgJsonFile);
  const jsonData = JSON.parse(data.toString());
  return jsonData.version;
}
