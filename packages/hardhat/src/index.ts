import path from 'path';
import './type-extensions';
import { extendConfig } from 'hardhat/config';

export * from './tasks';

extendConfig(config => {
  if (!config.paths.subgraph) {
    config.paths.subgraph = './subgraph';
  }

  const defaultConfig = {
    name: path.basename(config.paths.root),
    product: 'subgraph-studio',
    allowSimpleName: false,
    indexEvents: false,
  };

  config.subgraph = Object.assign(defaultConfig, config.subgraph);
});
