## NEAR blocks: Substreams triggers as subgraph mappings

A subgraph that uses a pre-existing [Substreams package](https://substreams.dev/graphprotocol/substreams-trigger-filter/v0.1.0) as the source of triggers for the subgraph mappings. This example detects new blocks on [NEAR](https://near.org/), tracking the block hash, timestamp, and gas price. 

## Prerequisites

This example requires [pnpm](https://pnpm.io/), the latest version of [Graph CLI](https://github.com/graphprotocol/graph-tooling), and a Protobuf AssemblyScript compiler such as [protobuf-as](https://github.com/gravitational/protobuf-as).

## Quickstart

``` bash
# Install dependencies
pnpm install

# Generate AssemblyScript types from Protobuf definitions in Substreams package
pnpm run protoc

#### Generate AssemblyScript types from GraphQL schema and contract ABIs
pnpm run codegen

# Note: Might be worth modifying package.json to allow doing both with one command
# i,e, `pnpm run generate_types`

# Build the subgraph
pnpm run build

# Create a subgraph in Subgraph Studio
pnpm run create

# Deploy the subgraph to Subgraph Studio
pnpm run deploy
```
