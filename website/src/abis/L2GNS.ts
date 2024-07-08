export const L2GNSABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'nameHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'contractAddress',
        type: 'address',
      },
    ],
    name: 'ContractSynced',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: '_counterpart',
        type: 'address',
      },
    ],
    name: 'CounterpartGNSAddressUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l1SubgraphId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l2SubgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_l2Curator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_tokens',
        type: 'uint256',
      },
    ],
    name: 'CuratorBalanceReceived',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l1SubgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_l2Curator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_tokens',
        type: 'uint256',
      },
    ],
    name: 'CuratorBalanceReturnedToBeneficiary',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'curator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nSignalBurnt',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawnGRT',
        type: 'uint256',
      },
    ],
    name: 'GRTWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'graphAccount',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'subgraphNumber',
        type: 'uint256',
      },
    ],
    name: 'LegacySubgraphClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'param',
        type: 'string',
      },
    ],
    name: 'ParameterUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'controller',
        type: 'address',
      },
    ],
    name: 'SetController',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'graphAccount',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nameSystem',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'nameIdentifier',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
    ],
    name: 'SetDefaultName',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'curator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nSignalBurnt',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'vSignalBurnt',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokensReceived',
        type: 'uint256',
      },
    ],
    name: 'SignalBurned',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'curator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nSignalCreated',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'vSignalCreated',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokensDeposited',
        type: 'uint256',
      },
    ],
    name: 'SignalMinted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nSignalTransferred',
        type: 'uint256',
      },
    ],
    name: 'SignalTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawableGRT',
        type: 'uint256',
      },
    ],
    name: 'SubgraphDeprecated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l2SubgraphID',
        type: 'uint256',
      },
    ],
    name: 'SubgraphL2TransferFinalized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'subgraphMetadata',
        type: 'bytes32',
      },
    ],
    name: 'SubgraphMetadataUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'subgraphNFT',
        type: 'address',
      },
    ],
    name: 'SubgraphNFTUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'reserveRatio',
        type: 'uint32',
      },
    ],
    name: 'SubgraphPublished',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l1SubgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: '_l2SubgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_tokens',
        type: 'uint256',
      },
    ],
    name: 'SubgraphReceivedFromL1',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'vSignalCreated',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokensSignalled',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'subgraphDeploymentID',
        type: 'bytes32',
      },
    ],
    name: 'SubgraphUpgraded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'subgraphID',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'versionMetadata',
        type: 'bytes32',
      },
    ],
    name: 'SubgraphVersionUpdated',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MAX_ROUNDING_ERROR',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SUBGRAPH_ID_ALIAS_OFFSET',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IGraphProxy',
        name: '_proxy',
        type: 'address',
      },
    ],
    name: 'acceptProxy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IGraphProxy',
        name: '_proxy',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'acceptProxyAndCall',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approveAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_nSignal',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tokensOutMin',
        type: 'uint256',
      },
    ],
    name: 'burnSignal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'controller',
    outputs: [
      {
        internalType: 'contract IController',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'counterpartGNSAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'deprecateSubgraph',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_l2SubgraphID',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphMetadata',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_versionMetadata',
        type: 'bytes32',
      },
    ],
    name: 'finishSubgraphTransferFromL1',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_l1SubgraphID',
        type: 'uint256',
      },
    ],
    name: 'getAliasedL2SubgraphID',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_curator',
        type: 'address',
      },
    ],
    name: 'getCuratorSignal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'getLegacySubgraphKey',
    outputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'seqID',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_l2SubgraphID',
        type: 'uint256',
      },
    ],
    name: 'getUnaliasedL1SubgraphID',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_controller',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_subgraphNFT',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'isLegacySubgraph',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'isPublished',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'legacySubgraphData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'vSignal',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'nSignal',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: '__DEPRECATED_reserveRatio',
        type: 'uint32',
      },
      {
        internalType: 'bool',
        name: 'disabled',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'withdrawableGRT',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'legacySubgraphKeys',
    outputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'accountSeqID',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_graphAccount',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_subgraphNumber',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphMetadata',
        type: 'bytes32',
      },
    ],
    name: 'migrateLegacySubgraph',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tokensIn',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_nSignalOutMin',
        type: 'uint256',
      },
    ],
    name: 'mintSignal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes[]',
        name: 'data',
        type: 'bytes[]',
      },
    ],
    name: 'multicall',
    outputs: [
      {
        internalType: 'bytes[]',
        name: 'results',
        type: 'bytes[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_nSignalIn',
        type: 'uint256',
      },
    ],
    name: 'nSignalToTokens',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_nSignalIn',
        type: 'uint256',
      },
    ],
    name: 'nSignalToVSignal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'nextAccountSeqID',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '_data',
        type: 'bytes',
      },
    ],
    name: 'onTokenTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenID',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ownerTaxPercentage',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_versionMetadata',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphMetadata',
        type: 'bytes32',
      },
    ],
    name: 'publishNewSubgraph',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_versionMetadata',
        type: 'bytes32',
      },
    ],
    name: 'publishNewVersion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_controller',
        type: 'address',
      },
    ],
    name: 'setController',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_counterpart',
        type: 'address',
      },
    ],
    name: 'setCounterpartGNSAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_graphAccount',
        type: 'address',
      },
      {
        internalType: 'uint8',
        name: '_nameSystem',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: '_nameIdentifier',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
    ],
    name: 'setDefaultName',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: '_ownerTaxPercentage',
        type: 'uint32',
      },
    ],
    name: 'setOwnerTaxPercentage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_subgraphNFT',
        type: 'address',
      },
    ],
    name: 'setSubgraphNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'subgraphL2TransferData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'tokens',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'l2Done',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'subgraphReceivedOnL2BlockNumber',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'subgraphNFT',
    outputs: [
      {
        internalType: 'contract ISubgraphNFT',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'subgraphSignal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'subgraphTokens',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'subgraphs',
    outputs: [
      {
        internalType: 'uint256',
        name: 'vSignal',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'nSignal',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'subgraphDeploymentID',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: '__DEPRECATED_reserveRatio',
        type: 'uint32',
      },
      {
        internalType: 'bool',
        name: 'disabled',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'withdrawableGRT',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'syncAllContracts',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tokensIn',
        type: 'uint256',
      },
    ],
    name: 'tokensToNSignal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'transferSignal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '_subgraphMetadata',
        type: 'bytes32',
      },
    ],
    name: 'updateSubgraphMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_vSignalIn',
        type: 'uint256',
      },
    ],
    name: 'vSignalToNSignal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_subgraphID',
        type: 'uint256',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
