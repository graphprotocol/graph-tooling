# Validator Rewards Example

This example subgraph stores `Reward` objects that represent rewards received by a validator in a Cosmos chain. In order to do that, an event handler is used to filter [reward](https://github.com/cosmos/cosmos-sdk/blob/13378bd2cfb9695da6477494e449b0a3bca9bc94/x/distribution/spec/06_events.md) events. The type of event to be filtered is specified in the subgraph manifest file. That way, the handler will just receive events of that type.

## Generating a manifest

The subgraph is compatible with multiple Cosmos networks so before building the subgraph you need to generate a manifest file for the network of your choice. In case of the Cosmos Hub network, run the following command:

```shell
$ yarn prepare:cosmoshub
```

For the list of supported networks, see the scripts in the [`package.json`](package.json) file.

## Querying the subgraph

With the following query, you can retrieve all the rewards received by the [Figment](https://atomscan.com/validators/cosmosvaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d) validator, and the amounts of each of the rewards:

```
query ValidatorRewards($validatorAddress: String!) {
  rewards(where: {validator: $validatorAddress}) {
    validator,
    amount
  }
}
```
```
{
    "validatorAddress": "cosmosvaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d"
}
```

For more information see the docs on https://thegraph.com/docs/.
