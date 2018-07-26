# The Graph CLI (graph-cli)

The Graph command line interface.

As of today, the command line interface consists of two commands:

- `graph codegen` — generates TypeScript code for smart contract ABIs used in The Graph data sources.
- `graph build` — compiles The Graph data sources to WebAssembly and deploys them to IPFS.

## How It Works

`graph` takes a `data-source.yaml` data source definition

- with references
  to a GraphQL schema,
- smart contract ABIs, and
- data source mappings written in TypeScript/AssemblyScript,

compiles the mappings to WebAssmebly and deploys a ready-to-use
version of the data source to IPFS (or a local directory for
debugging).

## Usage

Data sources for The Graph are set up just like any other TypeScript
project. It is recommended to install `graph-cli` as a local dependency
via `package.json` and use `npm` scripts for code generation and
building.

An example of this can be found in the [Decentraland repository](https://github.com/graphprotocol/decentraland/).

1.  Create a project for the data source with a `package.json` etc.
2.  Add a `data-source.yaml` definition with a GraphQL schema etc.
3.  Add `graph-cli` as a local dependency with one of
    ```bash
    npm install --save-dev graph-cli
    yarn add --dev graph-cli
    ```
4.  Add the following `tsconfig.json`:
    ```json
    {
      "extends": "./node_modules/graph-cli/tsconfig.json",
      "files": ["mapping.ts"]
    }
    ```
    _Note: Replace `"mapping.ts"` with your own mapping fil(e)s._
5.  Add the following to `package.json`:
    ```json
    {
      "scripts": {
        "codegen": "graph generate-types data-source.yaml",
        "build": "graph build data-source.yaml",
        "build-ipfs": "graph build --ipfs /ip4/127.0.0.1/tcp/5001 data-source.yaml"
      }
    }
    ```
    _Note: Replace the IPFS address with any IPFS node you want to deploy the data source to._
6.  Generate type definitions for contract ABIs used in the data
    with:
    ```bash
    yarn codegen
    ```
7.  Develop your `mapping.ts` against these generated types.
8.  Build with one of
    ```sh
    yarn build      # Will drop the results in dist/
    yarn build-ipfs # Will also deploy to IPFS and output an IPFS hash
    ```

## License

Copyright &copy; 2018 Graph Protocol, Inc. and contributors.

The Graph CLI is dual-licensed under the [MIT license](LICENSE-MIT) and the
[Apache License, Version 2.0](LICENSE-APACHE).
