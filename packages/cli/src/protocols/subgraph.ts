import immutable from 'immutable';

export interface SubgraphOptions {
  manifest?: any;
  resolveFile: (path: string) => string;
  protocol?: any;
}

export interface Subgraph extends SubgraphOptions {
  validateManifest(): immutable.List<any>;
  handlerTypes(): immutable.List<any>;
}
