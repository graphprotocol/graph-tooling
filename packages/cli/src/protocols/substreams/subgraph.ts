import immutable from 'immutable';
import { Subgraph, SubgraphOptions } from '../subgraph';

export default class SubstreamsSubgraph implements Subgraph {
  public manifest: SubgraphOptions['manifest'];
  public resolveFile: SubgraphOptions['resolveFile'];
  public protocol: SubgraphOptions['protocol'];

  constructor(options: SubgraphOptions) {
    this.manifest = options.manifest;
    this.resolveFile = options.resolveFile;
    this.protocol = options.protocol;
  }

  validateManifest() {
    return immutable.List();
  }

  handlerTypes() {
    return immutable.List([]);
  }
}
