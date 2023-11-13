# Osmosis Token Swaps Example

This example subgraph stores `TokenSwap` objects that represent token swaps made using the
[GAMM](https://docs.osmosis.zone/developing/osmosis-core/modules/spec-gamm.html) (Generalized
Automated Market Maker) in the Osmosis chain. In order to do that, an event handler is used to
filter
[token_swapped](https://github.com/osmosis-labs/osmosis/blob/c8ac95c6a6ea42e934d49599eafc8609b3c6fe61/x/gamm/types/events.go#L13)
events. The type of event to be filtered is specified in the subgraph manifest file. That way, the
handler will just receive events of that type.

By running this example subgraph, and with the following query, you can retrieve all the swaps made
by a given address:

```
query SwapsForAccount($senderAddress: String!) {
  tokenSwaps(where: {sender: $senderAddress}) {
    tokenIn {
      amount
      denom
    },
    tokenOut {
      amount
      denom
    }
  }
}
```

```
{
  "senderAddress": "osmo1wd3j7cvcnr3pfey4fx2mz9xml9euu68z6zg0xp"
}
```

For more information see the docs on https://thegraph.com/docs/.
