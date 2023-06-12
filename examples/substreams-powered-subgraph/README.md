# Substreams-powered subgraph: tracking contract creation

A basic Substreams-powered subgraph, including the Substreams definition. This example detects new
contract deployments on Ethereum, tracking the creation block and timestamp. There is a
demonstration of the Graph Node integration, using `substreams_entity_change` types and helpers.

## Prerequisites

This
[requires the dependencies necessary for local Substreams development](https://substreams.streamingfast.io/developers-guide/installation-requirements),
as well as Graph CLI >=0.51.1:

```
npm install -g @graphprotocol/graph-cli
```

## Quickstart

```
make protogen # create protobufs in /src/pb
make build # build substream
make package # pack substream
graph build # build subgraph
graph deploy # deploy subgraph
```
