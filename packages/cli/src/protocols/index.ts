import immutable from 'immutable';
import debug from '../debug.js';
import Subgraph from '../subgraph.js';
import * as ArweaveManifestScaffold from './arweave/scaffold/manifest.js';
import * as ArweaveMappingScaffold from './arweave/scaffold/mapping.js';
import ArweaveSubgraph from './arweave/subgraph.js';
import { ContractCtor } from './contract.js';
import * as CosmosManifestScaffold from './cosmos/scaffold/manifest.js';
import * as CosmosMappingScaffold from './cosmos/scaffold/mapping.js';
import CosmosSubgraph from './cosmos/subgraph.js';
import EthereumABI from './ethereum/abi.js';
import EthereumTemplateCodeGen from './ethereum/codegen/template.js';
import EthereumContract from './ethereum/contract.js';
import * as EthereumManifestScaffold from './ethereum/scaffold/manifest.js';
import * as EthereumMappingScaffold from './ethereum/scaffold/mapping.js';
import EthereumSubgraph from './ethereum/subgraph.js';
import EthereumTypeGenerator from './ethereum/type-generator.js';
import NearContract from './near/contract.js';
import * as NearManifestScaffold from './near/scaffold/manifest.js';
import * as NearMappingScaffold from './near/scaffold/mapping.js';
import NearSubgraph from './near/subgraph.js';
import { SubgraphOptions } from './subgraph.js';
import * as SubgraphDataSourceManifestScaffold from './subgraph/scaffold/manifest.js';
import * as SubgraphMappingScaffold from './subgraph/scaffold/mapping.js';
import SubgraphDataSource from './subgraph/subgraph.js';
import * as SubstreamsManifestScaffold from './substreams/scaffold/manifest.js';
import SubstreamsSubgraph from './substreams/subgraph.js';

const protocolDebug = debug('graph-cli:protocol');

export default class Protocol {
  static fromDataSources(dataSourcesAndTemplates: any) {
    const firstDataSource = dataSourcesAndTemplates[0];
    return new Protocol(firstDataSource);
  }

  name: ProtocolName;

  // TODO: should assert non null? see the constructor switch default case comment
  config!: ProtocolConfig;

  constructor(datasource: any) {
    /**
     * TODO: we should improve this `any` type, because some places
     * we can initiate a Protocol with just a string (the name) and
     * some other places use datasource object
     */
    const name = typeof datasource === 'string' ? datasource : datasource.kind;
    protocolDebug('Initializing protocol with datasource %O', datasource);
    this.name = Protocol.normalizeName(name)!;
    protocolDebug('Initializing protocol %s', this.name);

    switch (this.name) {
      case 'arweave':
        this.config = arweaveProtocol;
        break;
      case 'cosmos':
        this.config = cosmosProtocol;
        break;
      case 'ethereum':
        this.config = ethereumProtocol;
        break;
      case 'near':
        this.config = nearProtocol;
        break;
      case 'subgraph':
        this.config = subgraphProtocol;
        break;
      case 'substreams':
        this.config = substreamsProtocol;

        /**
         * Substreams triggers are a special case of substreams data sources
         * which have a mapping file and a handler.
         */
        if (datasource?.mapping?.file && datasource?.mapping.handler) {
          this.name = 'substreams/triggers';
        }
        break;
      default:
      // Do not throw when undefined, a better error message is printed after the constructor
      // when validating the Subgraph itself
    }
  }

  static availableProtocols() {
    return immutable.fromJS({
      // `ethereum/contract` is kept for backwards compatibility.
      // New networks (or protocol perhaps) shouldn't have the `/contract` anymore (unless a new case makes use of it).
      arweave: ['arweave'],
      ethereum: ['ethereum', 'ethereum/contract'],
      near: ['near'],
      cosmos: ['cosmos'],
      substreams: ['substreams'],
      subgraph: ['subgraph'],
    }) as immutable.Collection<ProtocolName, immutable.List<string>>;
  }

  static normalizeName(name: ProtocolName) {
    return Protocol.availableProtocols().findKey(possibleNames => {
      return possibleNames.includes(name);
    })!;
  }

  displayName() {
    return this.config?.displayName;
  }

  // Receives a data source kind, and checks if it's valid
  // for the given protocol instance (this).
  isValidKindName(kind: string) {
    return Protocol.availableProtocols().get(this.name, immutable.List()).includes(kind);
  }

  hasABIs() {
    return this.config.abi != null;
  }

  hasContract() {
    return this.config.contract != null;
  }

  isSubstreams() {
    return this.name === 'substreams';
  }

  hasEvents() {
    // A problem with hasEvents usage in the codebase is that it's almost every where
    // where used, the ABI data is actually use after the conditional, so it seems
    // both concept are related. So internally, we map to this condition.
    return this.hasABIs() && !this.isComposedSubgraph();
  }

  hasTemplates() {
    return this.config.getTemplateCodeGen != null;
  }

  hasDataSourceMappingFile() {
    return this.getMappingScaffold() != null;
  }

  getTypeGenerator(options: any) {
    if (this.config?.getTypeGenerator == null) {
      return null;
    }

    return this.config.getTypeGenerator(options);
  }

  getTemplateCodeGen(template: any) {
    if (!this.hasTemplates()) {
      throw new Error(`Template data sources with kind '${this.name}' are not supported yet`);
    }

    return this.config.getTemplateCodeGen?.(template);
  }

  getABI() {
    return this.config.abi;
  }

  getSubgraph(options: SubgraphOptions) {
    return this.config.getSubgraph({ ...options, protocol: this });
  }

  getContract() {
    return this.config.contract;
  }

  getManifestScaffold() {
    return this.config.manifestScaffold;
  }

  getMappingScaffold() {
    return this.config.mappingScaffold;
  }

  isComposedSubgraph() {
    return this.name === 'subgraph';
  }
}

export type ProtocolName =
  | 'arweave'
  | 'ethereum'
  | 'near'
  | 'cosmos'
  | 'substreams'
  | 'substreams/triggers'
  | 'subgraph';

export interface ProtocolConfig {
  displayName: string;
  abi?: any;
  contract?: ContractCtor;
  getTemplateCodeGen?: (template: any) => any;
  getTypeGenerator?: (options: any) => any;
  getSubgraph(options: SubgraphOptions): Subgraph;
  manifestScaffold: any;
  mappingScaffold: any;
}

const arweaveProtocol: ProtocolConfig = {
  displayName: 'Arweave',
  abi: undefined,
  contract: undefined,
  getTemplateCodeGen: undefined,
  getTypeGenerator: undefined,
  getSubgraph(options) {
    return new ArweaveSubgraph(options);
  },
  manifestScaffold: ArweaveManifestScaffold,
  mappingScaffold: ArweaveMappingScaffold,
};

const cosmosProtocol: ProtocolConfig = {
  displayName: 'Cosmos',
  abi: undefined,
  contract: undefined,
  getTemplateCodeGen: undefined,
  getTypeGenerator: undefined,
  getSubgraph(options) {
    return new CosmosSubgraph(options);
  },
  manifestScaffold: CosmosManifestScaffold,
  mappingScaffold: CosmosMappingScaffold,
};

const ethereumProtocol: ProtocolConfig = {
  displayName: 'Ethereum',
  abi: EthereumABI,
  contract: EthereumContract,
  getTemplateCodeGen(template) {
    return new EthereumTemplateCodeGen(template);
  },
  getTypeGenerator(options) {
    return new EthereumTypeGenerator(options);
  },
  getSubgraph(options) {
    return new EthereumSubgraph(options);
  },
  manifestScaffold: EthereumManifestScaffold,
  mappingScaffold: EthereumMappingScaffold,
};

const subgraphProtocol: ProtocolConfig = {
  displayName: 'Subgraph',
  abi: EthereumABI,
  contract: undefined,
  getTemplateCodeGen: undefined,
  getTypeGenerator(options) {
    return new EthereumTypeGenerator(options);
  },
  getSubgraph(options) {
    return new SubgraphDataSource(options);
  },
  manifestScaffold: SubgraphDataSourceManifestScaffold,
  mappingScaffold: SubgraphMappingScaffold,
};

const nearProtocol: ProtocolConfig = {
  displayName: 'NEAR',
  abi: undefined,
  contract: NearContract,
  getTypeGenerator: undefined,
  getTemplateCodeGen: undefined,
  getSubgraph(options) {
    return new NearSubgraph(options);
  },
  manifestScaffold: NearManifestScaffold,
  mappingScaffold: NearMappingScaffold,
};

const substreamsProtocol: ProtocolConfig = {
  displayName: 'Substreams',
  abi: undefined,
  contract: undefined,
  getTypeGenerator: undefined,
  getTemplateCodeGen: undefined,
  getSubgraph(options) {
    return new SubstreamsSubgraph(options);
  },
  manifestScaffold: SubstreamsManifestScaffold,
  mappingScaffold: undefined,
};
