---
'@graphprotocol/graph-ts': minor
---

Add `ethereum.decodeParams` for decoding ABI function-parameter data

`ethereum.decode` decodes its input as a single ABI value, which fails for
data whose top-level type is a tuple with a dynamic field (e.g. Gnosis Safe
`execTransaction`): transaction calldata and event data are encoded as ABI
function parameters and have no leading offset word. `ethereum.decodeParams`
decodes that parameter layout correctly. Use it for calldata/event data and
keep `ethereum.decode` for round-tripping `ethereum.encode` output.

Requires a graph-node that supports mapping apiVersion `0.0.10`.
