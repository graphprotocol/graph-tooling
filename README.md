# The Graph CLI (graph-cli)

[![npm (scoped)](https://img.shields.io/npm/v/@graphprotocol/graph-cli.svg)](https://www.npmjs.com/package/@graphprotocol/graph-cli)
[![Build Status](https://travis-ci.org/graphprotocol/graph-cli.svg?branch=master)](https://travis-ci.org/graphprotocol/graph-cli)

The Graph command line interface.

As of today, the command line interface consists of five commands:

- `graph codegen` — generates TypeScript code for smart contract ABIs used in subgraphs.
- `graph build` — compiles subgraphs to WebAssembly and deploys them to IPFS.
- `graph deploy` — deploys subgraphs to a [Graph Node](https://github.com/graphprotocol/graph-node).
- `graph remove` — removes subgraphs from a [Graph Node](https://github.com/graphprotocol/graph-node).
- `graph auth` — saves access token for [Graph Node](https://github.com/graphprotocol/graph-node) to the system's keychain.

## How It Works

`graph` takes a subgraph manifest (defaults to `subgraph.yaml`) with references to

- a GraphQL schema,
- smart contract ABIs,
- mappings written in TypeScript/AssemblyScript.

It compiles the mappings to WebAssembly, builds a ready-to-use version of the subgraph saved to IPFS or a local directory for debugging, and deploys the subgraph to a [Graph Node](https://github.com/graphprotocol/graph-node).

## Usage

Subgraphs for The Graph are set up like a typical TypeScript
project. It is recommended to install `graph-cli` as a local dependency
via `package.json` and use `npm` scripts for code generation and
building.

If you are just getting started with creating a subgraph, head to [getting started](https://github.com/graphprotocol/graph-node/blob/master/docs/getting-started.md). Eventually this guide will lead you back here.

For clarity, an example of the setup below can be found in the [ENS subgraph repository](https://github.com/graphprotocol/ens-subgraph).

### On Linux

`libsecret` is used for storing access tokens, so you may need to install it
before getting started. Use one of the following commands depending on
your distribution:
- Debian/Ubuntu: `sudo apt-get install libsecret-1-dev`
- Red Hat: `sudo yum install libsecret-devel`
- Arch Linux: `sudo pacman -S libsecret`

### Steps

1.  Create a project for the subgraph with a `package.json` etc.
2.  Add a `subgraph.yaml` subgraph manifest with a GraphQL schema etc.
3.  Add `@graphprotocol/graph-cli` and `@graphprotocol/graph-ts` dependencies, with one of

    ```bash
    # NPM
    npm install --save-dev
      @graphprotocol/graph-cli \
      @graphprotocol/graph-ts

    # Yarn
    yarn add --dev \
      @graphprotocol/graph-cli \
      @graphprotocol/graph-ts
    ```

4.  Add the following `tsconfig.json`:
    ```json
    {
      "extends": "./node_modules/@graphprotocol/graph-ts/tsconfig.json",
      "compilerOptions": {
        "types": ["@graphprotocol/graph-ts"]
      }
    }
    ```
5.  Add the following to `package.json`:
    ```json
    {
      "scripts": {
        "codegen": "graph codegen --output-dir types/",
        "build": "graph build",
        "build-ipfs": "graph build --ipfs /ip4/127.0.0.1/tcp/5001",
        "deploy":
          "graph deploy --ipfs /ip4/127.0.0.1/tcp/5001 --node http://127.0.0.1:8020 --subgraph-name <SUBGRAPH_NAME>"
      }
    }
    ```
    _Note: Replace the IP addresses and ports with any
    [Graph Node](https://github.com/graphprotocol/graph-node) you want
    to deploy the subgraph to._
6.  Generate type definitions for contract ABIs used in the subgraph.
    with:
    ```bash
    yarn codegen
    ```
    
     This creates the `types/` folder. This folder does not need to be uploaded to GitHub, and the files within it should not be edited.
    
7.  Develop your `mapping.ts` against these generated types. If you are new to this process, you can head over to [getting started](https://github.com/graphprotocol/graph-node/blob/master/docs/getting-started.md#34-write-your-mappings) for a beginner friendly walkthrough of The Graph.
8.  Build the subgraph with:
    ```sh
    yarn build
    ```
9.  Deploy your subgraph to a
    [Graph Node](https://github.com/graphprotocol/graph-node). The following
    command builds and deploys the subgraph continuously as you are making
    changes to it:
    ```sh
    graph \
       deploy \
       --watch \
       --verbosity debug \
       --node http://127.0.0.1:8020/ \
       --ipfs /ip4/127.0.0.1/tcp/5001 \
       --subgraph-name <SUBGRAPH_NAME>
    ```
    _Note: If the Graph Node you are deploying to requires authorization,
    make sure to authorize with the node using e.g. `graph auth http://127.0.0.`:8020 <ACCESS_TOKEN>`
    before deploying._

To remove a subgraph from the [Graph Node](https://github.com/graphprotocol/graph-node), use:
```sh
graph \
  remove \
  --node http://127.0.0.1:8020/ \
  --subgraph-name <SUBGRAPH_NAME>
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

