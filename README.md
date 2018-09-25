# The Graph CLI (graph-cli)

[![npm (scoped)](https://img.shields.io/npm/v/@graphprotocol/graph-cli.svg)](https://www.npmjs.com/package/@graphprotocol/graph-cli)
[![Build Status](https://travis-ci.org/graphprotocol/graph-cli.svg?branch=master)](https://travis-ci.org/graphprotocol/graph-cli)

The Graph command line interface.

As of today, the command line interface consists of two commands:

- `graph codegen` — generates TypeScript code for smart contract ABIs used in subgraphs.
- `graph build` — compiles subgraphs to WebAssembly and deploys them to IPFS.

## How It Works

`graph` takes a `subgraph.yaml` subgraph manifest with

- references to a GraphQL schema,
- smart contract ABIs, and
- mappings written in TypeScript/AssemblyScript,

compiles the mappings to WebAssembly and deploys a ready-to-use
version of the subgraph to IPFS or a local directory for debugging.

## Usage

Subgraphs for The Graph are set up just like any regular TypeScript
project. It is recommended to install `graph-cli` as a local dependency
via `package.json` and use `npm` scripts for code generation and
building.

An example of this can be found in the [Decentraland repository](https://github.com/graphprotocol/decentraland/).

1.  Create a project for the subgraph with a `package.json` etc.
2.  Add a `subgraph.yaml` subgraph manifest with a GraphQL schema etc.
3.  Add `@graphprotocol/graph-cli` as a local dependency with one of
    ```bash
    npm install --save-dev @graphprotocol/graph-cli # NPM
    yarn add --dev @graphprotocol/graph-cli         # Yarn
    ```
4.  Add the following `tsconfig.json`:
    ```json
    {
      "extends": "./node_modules/@graphprotocol/graph-cli/tsconfig.json",
      "compilerOptions": {
        "types": ["@graphprotocol/graph-cli"]
      }
    }
    ```
5.  Add the following to `package.json`:
    ```json
    {
      "scripts": {
        "codegen": "graph generate-types subgraph.yaml",
        "build": "graph build subgraph.yaml",
        "build-ipfs": "graph build --ipfs /ip4/127.0.0.1/tcp/5001 subgraph.yaml",
        "deploy": "graph deploy subgraph.yaml --watch --verbosity debug --node http://35.242.224.197:8020/ --ipfs /ip4/35.242.224.197/tcp/8030 --subgraph-name my-subgraph"
      }
    }
    ```
    _Note: Replace the IPFS address with any IPFS node you want to deploy the subgraph to._
6.  Generate type definitions for contract ABIs used in the subgraph
    with:
    ```bash
    yarn codegen
    ```
7.  Develop your `mapping.ts` against these generated types.
8.  Build the subgraph with one of
    ```sh
    yarn build      # Will drop the results in dist/
    yarn build-ipfs # Will also deploy to IPFS and output an IPFS hash
    ```
9.  Deploy your subgraph to a Graph Node. The following command builds and deploys the subgraph continuously as you are making changes to it:
    ```sh
    graph \
       --watch \
       --verbosity debug \
       --node http://35.242.224.197:8020/ \
       --ipfs /ip4/35.242.224.197/tcp/8030 \
       --subgraph-name my-subgraph \
       deploy \
       subgraph.yaml
    ```


## License

Copyright &copy; 2018 Graph Protocol, Inc. and contributors.

The Graph CLI is dual-licensed under the [MIT license](LICENSE-MIT) and the
[Apache License, Version 2.0](LICENSE-APACHE).

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
