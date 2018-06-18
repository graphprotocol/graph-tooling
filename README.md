# the-graph-wasm

This tool compiles data source definitions for WASM runtime of The Graph.

## How It Works

`the-graph-wasm` takes a `data-source.yaml` data source definition (with references
to a GraphQL schema, smart contract ABIs and data source mappings written in
TypeScript/AssemblyScript), compiles the mappings to WASM and outputs a ready-to-use
version of the data source.

## Installation

```bash
npm install -g https://github.com/graphprotocol/the-graph-wasm
```

## Usage

```bash
the-graph-wasm TODO
```
