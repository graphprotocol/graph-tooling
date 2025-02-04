# Example Subgraphs

This section contains several subgraph examples to help you get started with [The Graph](https://thegraph.com/). Each example demonstrates specific configurations and assumes basic familiarity with subgraph components.

## Table of Contents

1. **[Aggregations](https://github.com/graphprotocol/graph-tooling/examples/aggregations)**  
   This example demonstrates how to aggregate data using block numbers as predictable values. The comments in the schema, subgraph manifest, and mappings provide guidance for implementing custom aggregations.

2. **[Arweave Blocks and Transactions](https://github.com/graphprotocol/graph-tooling/tree/examples/arweave-blocks-transactions)**  
   This example indexes blocks, transactions, tags, and POAs on the Arweave blockchain. Please note that it requires `graph-cli` version 0.30.2 or above to build.

3. **[Cosmos Block Filtering](https://github.com/graphprotocol/graph-tooling/examples/cosmos-block-filtering)**  
   This example stores `Block` objects that represent blocks appended to a Cosmos chain, saving only the block number and timestamp to the store.

4. **[Cosmos Osmosis Token Swaps](https://github.com/graphprotocol/graph-tooling/examples/cosmos-osmosis-token-swaps)**  
   This example stores `TokenSwap` objects that represent token swaps made using the Generalized Automated Market Maker (GAMM) in the Osmosis chain.

5. **[Cosmos Validator Delegations](https://github.com/graphprotocol/graph-tooling/examples/cosmos-validator-delegations)**  
   This example stores `Delegation` objects representing validator delegations on a Cosmos chain.

6. **[Cosmos Validator Rewards](https://github.com/graphprotocol/graph-tooling/examples/cosmos-validator-rewards)**  
   This example stores `Reward` objects representing rewards received by validators on a Cosmos chain.

7. **[Ethereum Basic Event Handlers](https://github.com/graphprotocol/graph-tooling/examples/ethereum-basic-event-handlers)**  
   This example shows how to handle basic events on the Ethereum blockchain using The Graph. It provides a practical implementation of event handlers, showcasing how to index and query blockchain data.

8. **[Ethereum Gravatar](https://github.com/graphprotocol/graph-tooling/examples/ethereum-gravatar)**  
   This example indexes data from the Ethereum Gravatar smart contract. Gravatar is a service where users can create and manage globally unique avatars.

9. **[Example Subgraph](https://github.com/graphprotocol/graph-tooling/examples/example-subgraph)**  
   This example shows the structure of a minimal,basic subgraph. It provides a generic setup with a simple contract and schema designed to teach the fundamentals of defining, mapping, and querying subgraph data.

10. **[Matic Lens Protocol Posts Subgraph](https://github.com/graphprotocol/graph-tooling/examples/matic-lens-protocol-posts-subgraph)**  
    This example demonstrates how to index data from the Lens Protocol deployed on the Polygon (Matic) network.

11. **[NEAR Blocks](https://github.com/graphprotocol/graph-tooling/examples/near-blocks)**  
    This example indexes blockchain data from the NEAR Protocol. It listens to block-related events and stores key data such as block number, timestamp, and hash in a queryable format.

12. **[NEAR Receipts](https://github.com/graphprotocol/graph-tooling/examples/near-receipts)**  
    This example indexes transaction receipts from the NEAR Protocol. It tracks and stores receipt data such as transaction hash, status, and execution details.

13. **[Substreams Powered Subgraph](https://github.com/graphprotocol/graph-tooling/examples/substreams-powered-subgraph)**  
    This example is a basic Substreams-powered subgraph, which includes the Substreams definition. It tracks new contract deployments on Ethereum and demonstrates integration with Graph Node using `substreams_entity_change` types and helpers.

To learn more about subgraphs, review [subgraphs](https://thegraph.com/docs/en/subgraphs/developing/subgraphs/) on [The Graph docs](https://thegraph.com/docs/en/).
