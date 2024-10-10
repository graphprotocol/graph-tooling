import type { Manifest } from '@graphprotocol/graph-cli-core';
import EthereumTypeGenerator from './ethereum/type-generator';
import { DataSource, DataSourceKind, protocolDebugger, ProtocolName } from './utils';

export default class Protocol {
  public datasource: DataSource;
  public name: ProtocolName;
  public kind: DataSourceKind;

  constructor(manifest: Manifest) {
    // we only support one datasource for now
    this.datasource = manifest.dataSources[0];
    protocolDebugger('Initialized protocol: %o', this.datasource);

    this.kind = this.datasource.kind;

    switch (this.kind) {
      case 'arweave':
        this.name = 'arweave';
        break;
      case 'cosmos':
        this.name = 'cosmos';
        break;
      case 'ethereum':
        this.name = 'ethereum';
        break;
      case 'near':
        this.name = 'near';
        break;
      case 'substreams':
        this.name = 'substreams';
        break;
      default:
        throw new Error(`Unsupported data source kind '${this.kind}'`);
    }
  }

  hasAbis() {
    return 'abis' in this.datasource.mapping ? this.datasource.mapping.abis.length > 0 : false;
  }

  getTypeGenerator() {
    switch (this.kind) {
      case 'arweave':
        return null;
      case 'cosmos':
        return null;
      case 'ethereum':
      case 'ethereum/contract':
        return new EthereumTypeGenerator(this.datasource);
      case 'near':
        return null;
      case 'substreams':
        return null;
        break;
      default:
        throw new Error(`Unsupported data source kind '${this.kind}'`);
    }
  }
}
