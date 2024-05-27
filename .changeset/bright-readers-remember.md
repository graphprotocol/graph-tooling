---
'@graphprotocol/graph-cli': minor
---

Introduce `graph publish` command.

Now you can publish your subgraphs directly from the CLI. This command will build your subgraph, deploy, prompt you to add metadata and then sign the transaction to publish it to the Graph Network.

1. Build the subgraph and publish it to the network.

```sh
graph publish
```

2. Provide a IPFS Hash for the subgraph and publish it to the network.

```sh
graph publish --ipfs <ipfs-hash>
```

3. You can use a custom webapp url to use for deploying.

```sh
graph publish --webapp-url <webapp-url>
```
