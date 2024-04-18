## NEAR blocks: Substreams triggers as subgraph mappings

A subgraph that uses a pre-existing [Substreams package](https://substreams.dev/graphprotocol/substreams-trigger-filter/v0.1.0) as the source of triggers for the subgraph mappings. This example detects new blocks on [NEAR](https://near.org/), tracking the block hash, timestamp, and gas price. 

## Prerequisites

This example requires a Protobuf AssemblyScript compiler such as [protobuf-as](https://github.com/gravitational/protobuf-as).

## Quickstart

``` bash
# Install dependencies
npm install

# Generate AssemblyScript types from GraphQL schema and smart contract ABI
graph codegen

# Download Substreams package
wget https://spkg.io/graphprotocol/substreams-trigger-filter-v0.1.0.spkg

# Download protobuf definitions for the Substreams package
wget https://raw.githubusercontent.com/mangas/near-wasm-block/main/proto/near.proto -P ./proto/
wget https://raw.githubusercontent.com/mangas/near-wasm-block/main/proto/receipts.proto -P ./proto/

# Note: protobuf-as required node 16
# Generate AssemblyScript types from protobuf definitions 
mkdir ./src/pb/
protoc --plugin=./node_modules/protobuf-as/bin/protoc-gen-as --as_out=./src/pb/ ./proto/*.proto

# Build the subgraph
graph build

```
