---
'@graphprotocol/graph-cli': minor
---

Add `--publish-network` flag to `graph deploy`. When provided, its value is sent
to the deployment router as the `publish_to_graph_network` param of the
`subgraph_deploy` JSON-RPC request. When the flag is omitted, the param is left
out of the request entirely.
