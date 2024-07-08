import immutable from 'immutable';
import debug from '../debug';
import Subgraph from '../subgraph';
import * as ArweaveManifestScaffold from './arweave/scaffold/manifest';
import * as ArweaveMappingScaffold from './arweave/scaffold/mapping';
import ArweaveSubgraph from './arweave/subgraph';
import { ContractCtor } from './contract';
import * as CosmosManifestScaffold from './cosmos/scaffold/manifest';
import * as CosmosMappingScaffold from './cosmos/scaffold/mapping';
import CosmosSubgraph from './cosmos/subgraph';
import EthereumABI from './ethereum/abi';
import EthereumTemplateCodeGen from './ethereum/codegen/template';
import EthereumContract from './ethereum/contract';
import * as EthereumManifestScaffold from './ethereum/scaffold/manifest';
import * as EthereumMappingScaffold from './ethereum/scaffold/mapping';
import EthereumSubgraph from './ethereum/subgraph';
import EthereumTypeGenerator from './ethereum/type-generator';
import NearContract from './near/contract';
import * as NearManifestScaffold from './near/scaffold/manifest';
import * as NearMappingScaffold from './near/scaffold/mapping';
import NearSubgraph from './near/subgraph';
import { SubgraphOptions } from './subgraph';
import * as SubstreamsManifestScaffold from './substreams/scaffold/manifest';
import SubstreamsSubgraph from './substreams/subgraph';

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
    }) as immutable.Collection<ProtocolName, string[]>;
  }

  static availableNetworks() {
    return immutable.fromJS({
      arweave: ['arweave-mainnet'],
      ethereum: [
        'mainnet',
        'rinkeby',
        'goerli',
        'poa-core',
        'poa-sokol',
        'gnosis',
        'matic',
        'mumbai',
        'fantom',
        'fantom-testnet',
        'bsc',
        'chapel',
        'clover',
        'avalanche',
        'fuji',
        'celo',
        'celo-alfajores',
        'fuse',
        'moonbeam',
        'moonriver',
        'mbase',
        'arbitrum-one',
        'arbitrum-goerli',
        'arbitrum-sepolia',
        'optimism',
        'optimism-goerli',
        'aurora',
        'aurora-testnet',
        'base-testnet',
        'base',
        'zksync-era',
        'zksync-era-testnet',
        'sepolia',
        'polygon-zkevm-testnet',
        'polygon-zkevm',
        'scroll-sepolia',
        'scroll',
      ],
      near: ['near-mainnet', 'near-testnet'],
      cosmos: [
        'cosmoshub-4',
        'theta-testnet-001', // CosmosHub testnet
        'osmosis-1',
        'osmo-test-4', // Osmosis testnet
        'juno-1',
        'uni-3', // Juno testnet
      ],
      substreams: ['mainnet'],
    }) as immutable.Map<
      | 'arweave'
      | 'ethereum'
      | 'near'
      | 'cosmos'
      | 'substreams'
      // this is temporary, until we have a better way to handle substreams triggers
      | 'substreams/triggers',
      immutable.List<string>
    >;
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

  hasEvents() {
    // A problem with hasEvents usage in the codebase is that it's almost every where
    // where used, the ABI data is actually use after the conditional, so it seems
    // both concept are related. So internally, we map to this condition.
    return this.hasABIs();
  }

  hasTemplates() {
    return this.config.getTemplateCodeGen != null;
  }

  hasDataSourceMappingFile() {
    return this.getMappingScaffold() != null;
  }

  getTypeGenerator(options: any) {
    if (this.config == null || this.config.getTypeGenerator == null) {
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
}

export type ProtocolName =
  | 'arweave'
  | 'ethereum'
  | 'near'
  | 'cosmos'
  | 'substreams'
  | 'substreams/triggers';

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

protocolDebug('Available networks %M', Protocol.availableNetworks());
