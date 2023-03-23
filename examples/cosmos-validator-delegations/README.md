# Validator Delegations Example

This example subgraph stores `Delegation` objects that represent delegations being made in a Cosmos chain. In order to do that, the handler function checks all messages within the transaction and filters them in order to decode and save just the ones that represent a delegation in the chain.

## Generating a manifest

The subgraph is compatible with multiple Cosmos networks so before building the subgraph you need to generate a manifest file for the network of your choice. In case of the Cosmos Hub network, run the following command:

```shell
$ yarn prepare:cosmoshub
```

For the list of supported networks, see the scripts in the [`package.json`](package.json) file.

## Querying the subgraph

With the following query you can retrieve all the delegations made to the [Figment](https://atomscan.com/validators/cosmosvaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d) validator, and the amounts of each of the delegations:

```
query ValidatorDelegations($validatorAddress: String!) {
  delegations(where: {validatorAddress: $validatorAddress}) {
    validatorAddress,
    delegatorAddress,
    amount {
      amount,
      denom
    }
  }
}
```
```
{
    "validatorAddress": "cosmosvaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d"
}
```

For more information see the docs on https://thegraph.com/docs/.
