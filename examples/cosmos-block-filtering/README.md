# Block Filtering Example

This example subgraph stores `Block` objects that represent blocks appended to a Cosmos chain. It's a very simple implementation where just the block number and the block timestamp is saved to the store.

## Generating a manifest

The subgraph is compatible with multiple Cosmos networks so before building the subgraph you need to generate a manifest file for the network of your choice. In case of the Cosmos Hub network, run the following command:

```shell
$ yarn prepare:cosmoshub
```

For the list of supported networks, see the scripts in the [`package.json`](package.json) file.

## Querying the subgraph

With the following query, you can retrieve all the appended blocks between two dates:

```
query BlocksBetweenDates($timestamp_start: BigInt!, $timestamp_end: BigInt!) {
  blocks(where: {timestamp_gt: $timestamp_start, timestamp_lt: $timestamp_end}) {
    id,
    number,
    timestamp
  }
}
```
```
{
  "timestamp_start": 1613653200,
  "timestamp_end": 1613656800
}
```

For more information see the docs on https://thegraph.com/docs/.
