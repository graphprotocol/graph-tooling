const immutable = require('immutable')
const ArweaveSubgraph = require('./arweave/subgraph')
const EthereumTypeGenerator = require('./ethereum/type-generator')
const EthereumTemplateCodeGen = require('./ethereum/codegen/template')
const EthereumABI = require('./ethereum/abi')
const EthereumSubgraph = require('./ethereum/subgraph')
const NearSubgraph = require('./near/subgraph')
const CosmosSubgraph = require('./cosmos/subgraph')
const SubstreamsSubgraph = require('./substreams/subgraph')
const EthereumContract = require('./ethereum/contract')
const NearContract = require('./near/contract')
const ArweaveManifestScaffold = require('./arweave/scaffold/manifest')
const EthereumManifestScaffold = require('./ethereum/scaffold/manifest')
const NearManifestScaffold = require('./near/scaffold/manifest')
const CosmosManifestScaffold = require('./cosmos/scaffold/manifest')
const SubstreamsManifestScaffold = require('./substreams/scaffold/manifest')
const ArweaveMappingScaffold = require('./arweave/scaffold/mapping')
const EthereumMappingScaffold = require('./ethereum/scaffold/mapping')
const NearMappingScaffold = require('./near/scaffold/mapping')
const CosmosMappingScaffold = require('./cosmos/scaffold/mapping')
const { ThrowStatement } = require('assemblyscript')

let protocolDebug = require('../debug')('graph-cli:protocol')

class Protocol {
  static fromDataSources(dataSourcesAndTemplates) {
    const firstDataSourceKind = dataSourcesAndTemplates[0].kind
    return new Protocol(firstDataSourceKind)
  }

  constructor(name) {
    this.name = Protocol.normalizeName(name)

    switch (this.name) {
      case 'arweave':
        this.config = arweaveProtocol
        break
      case 'cosmos':
        this.config = cosmosProtocol
        break
      case 'ethereum':
        this.config = ethereumProtocol
        break
      case 'near':
        this.config = nearProtocol
        break
      case 'substreams':
        this.config = substreamsProtocol
        break
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
    })
  }

  static availableNetworks() {
    let networks = immutable.fromJS({
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
        'arbitrum-rinkeby',
        'optimism',
        'optimism-kovan',
        'aurora',
        'aurora-testnet',
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
    })

    let allNetworks = []
    networks.forEach(value => {
      allNetworks.push(...value)
    })

    networks = networks.set('substreams', immutable.fromJS(allNetworks))

    return networks
  }

  static normalizeName(name) {
    return Protocol.availableProtocols().findKey(possibleNames => {
      return possibleNames.includes(name)
    })
  }

  displayName() {
    return this.config.displayName
  }

  // Receives a data source kind, and checks if it's valid
  // for the given protocol instance (this).
  isValidKindName(kind) {
    return Protocol.availableProtocols()
      .get(this.name, immutable.List())
      .includes(kind)
  }

  hasABIs() {
    return this.config.abi != null
  }

  hasContract() {
    return this.config.contract != null
  }

  hasEvents() {
    // A problem with hasEvents usage in the codebase is that it's almost every where
    // where used, the ABI data is actually use after the conditional, so it seems
    // both concept are related. So internally, we map to this condition.
    return this.hasABIs()
  }

  hasTemplates() {
    return this.config.getTemplateCodeGen != null
  }

  hasDataSourceMappingFile() {
    return this.config.getMappingScaffold != null
  }

  getTypeGenerator(options) {
    if (this.config == null || this.config.getTypeGenerator == null) {
      return null
    }

    return this.config.getTypeGenerator(options)
  }

  getTemplateCodeGen(template) {
    if (!this.hasTemplates()) {
      throw new Error(
        `Template data sources with kind '${this.name}' are not supported yet`,
      )
    }

    return this.config.getTemplateCodeGen(template)
  }

  getABI() {
    return this.config.abi
  }

  getSubgraph(options = {}) {
    return this.config.getSubgraph({ ...options, protocol: this })
  }

  getContract() {
    return this.config.contract
  }

  getManifestScaffold() {
    return this.config.manifestScaffold
  }

  getMappingScaffold() {
    return this.config.mappingScaffold
  }
}

const arweaveProtocol = {
  displayName: 'Arweave',
  abi: undefined,
  contract: undefined,
  getTemplateCodeGen: undefined,
  getTypeGenerator: undefined,
  getSubgraph(options) {
    return new ArweaveSubgraph(options)
  },
  manifestScaffold: ArweaveManifestScaffold,
  mappingScaffold: ArweaveMappingScaffold,
}

const cosmosProtocol = {
  displayName: 'Cosmos',
  abi: undefined,
  contract: undefined,
  getTemplateCodeGen: undefined,
  getTypeGenerator: undefined,
  getSubgraph(options) {
    return new CosmosSubgraph(options)
  },
  manifestScaffold: CosmosManifestScaffold,
  mappingScaffold: CosmosMappingScaffold,
}

const ethereumProtocol = {
  displayName: 'Ethereum',
  abi: EthereumABI,
  contract: EthereumContract,
  getTemplateCodeGen(template) {
    return new EthereumTemplateCodeGen(template)
  },
  getTypeGenerator(options) {
    return new EthereumTypeGenerator(options)
  },
  getSubgraph(options) {
    return new EthereumSubgraph(options)
  },
  manifestScaffold: EthereumManifestScaffold,
  mappingScaffold: EthereumMappingScaffold,
}

const nearProtocol = {
  displayName: 'NEAR',
  abi: undefined,
  contract: NearContract,
  getTypeGenerator: undefined,
  getTemplateCodeGen: undefined,
  getSubgraph(options) {
    return new NearSubgraph(options)
  },
  manifestScaffold: NearManifestScaffold,
  mappingScaffold: NearMappingScaffold,
}

const substreamsProtocol = {
  displayName: 'Substreams',
  abi: undefined,
  contract: undefined,
  getTypeGenerator: undefined,
  getTemplateCodeGen: undefined,
  getSubgraph(options) {
    return new SubstreamsSubgraph(options)
  },
  manifestScaffold: SubstreamsManifestScaffold,
  mappingScaffold: undefined,
}

protocolDebug('Available networks %M', Protocol.availableNetworks())
module.exports = Protocol
