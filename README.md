# the-graph-wasm

This tool compiles data source definitions for WASM runtime of The Graph.

## How It Works

`the-graph-wasm` takes a `data-source.yaml` data source definition (with references
to a GraphQL schema, smart contract ABIs and data source mappings written in
TypeScript/AssemblyScript), compiles the mappings to WASM and outputs a ready-to-use
version of the data source.

## Usage (TypeScript package)

An example of this can be found in [examples/memefactory/](examples/memefactory/).

1.  Install the package
    ```bash
    yarn add the-graph-wasm
    ```
2.  Add the following `tsconfig.json`:
    ```json
    {
      "extends": "./node_modules/the-graph-wasm/tsconfig.json",
      "files": ["mapping.ts"]
    }
    ```
3.  Add a GraphQL schema file and a data source definition.
4.  Add the following to `package.json`:
    ```json
    {
      ...,
      "scripts": {
        "build": "the-graph-wasm compile data-source.yaml"
      },
      ...
    }
    ```
5.  Build with
    ```bash
    yarn build
    ```

## Usage (CLI)

```bash
npm install -g https://github.com/graphprotocol/the-graph-wasm
the-graph-wasm compile data-source.yaml
```
