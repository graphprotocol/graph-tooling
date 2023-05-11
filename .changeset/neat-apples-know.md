---
'@graphprotocol/graph-cli': minor
---

For substreams generate the directory tree as follows
```
.
├── package.json
├── schema.graphql
└── subgraph.yaml
```

In the `package.json` we only depend on the CLI since that is what developer will use to deploy the subgraph. The `schema.graphql` is the schema of the subgraph and the `subgraph.yaml` is the manifest file for the subgraph.
