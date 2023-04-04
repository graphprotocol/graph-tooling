---
'@graphprotocol/graph-cli': patch
---

Fixes `graph add` overwriting the event names in `subgraph.yaml` and the ABI file when existing
contracts have events with the same name.
