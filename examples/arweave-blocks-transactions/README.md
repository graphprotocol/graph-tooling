# Arweave Blocks and Transactions Example
This subgraph is indexing blocks, transactions, tags, and POAs. Make sure to replace the `owner` field inside the .yaml file with the owner id.

> NOTE: The id of an owner is not required, the subgraph can index all blocks and transactions.

### Dev Dependencies
To be able to build an Arweave subgraph, you need a graph-cli version of 0.30.2 or above. Run the command below to update to the latest version:

```
npm-update -g i @graphprotocol/graph-cli
```

### Querying the Subgraph
With the following query, you can retrieve all the appended blocks between two dates:
```graphql
query BlocksBetweenDates($timestamp_start: BigInt!, $timestamp_end: BigInt!) {
  blocks(where: {timestamp_gt: $timestamp_start, timestamp_lt: $timestamp_end}) {
    id
    timestamp
    height
  }
}
```

For more information see the docs on https://thegraph.com/docs/.
