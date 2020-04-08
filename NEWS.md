# NEWS

Note: This file only includes short summaries of the changes introduced in
each release. More detailed release notes can be found in the
[graph-node](https://github.com/graphprotocol/graph-node/tree/master/NEWS.md)
repo.

## Unreleased

tbd

## 0.18.0

### Feature: `graph test` (#414, #420, #421)

This release introduces a new `graph test` command that can be used to run
test commands against a (customizable) test environment (by default: Graph
Node, Postgres, IPFS and Ganache in Docker Compose).

This essentially provides a framework for writing integration tests, where a
subgraph is indexed against a fresh Graph node, tests can wait for it to
synced, run queries at specific blocks and so on.

```
graph test [options] <test-command>

Options:

  -h, --help                    Show usage information
      --compose-file <file>     Custom Docker Compose file for additional services (optional)
      --node-image <image>      Custom Graph Node image to test against (default: graphprotocol/graph-node:latest)
      --standalone-node <cmd>   Use a standalone Graph Node outside Docker Compose (optional)
      --standalone-node-args    Custom arguments to be passed to the standalone Graph Node (optional)
      --skip-wait-for-ipfs      Don't wait for IPFS to be up at localhost:5001 (optional)
      --skip-wait-for-ethereum  Don't wait for Ethereum to be up at localhost:8545 (optional)
      --skip-wait-for-postgres  Don't wait for Postgres to be up at localhost:5432 (optional)
      --node-logs               Print the Graph Node logs (optional)
```

The `<test-command>` can be anything: it can be a shell script that builds
and deploys a subgraph, it can be a JS test suite run with Jest or it can be
a Truffle test suite, run with `truffle test`.

Overriding the `--node-image` allows to use a custom build of Graph Node,
which is useful for running integration tests for specific versions of Graph
Node.

Overriding the `--compose-file` allows to e.g. use a different Ethereum
provider than the default Ganache, making it possible to test subgraphs
against mainnet for instance.

### Misc

- Fix codegen for tuple arrays (#455 via #456). Thanks @JamesLefrere!
- Add `createWithContext()` code generation for data source templates (#446).
- Fix building in situations where `subgraph.yaml` is not in the working
  directory (#443).
- Add validation for new `@fulltext` directive (#433).
- Fix `URL` not being defined in older Node.js versions (#422).
- Add auto-migration from `apiVersion` 0.0.3 to 0.0.4 (#418).
- Fix Entity field getters for nullable fields (#417).
- Add support for overloaded Ethereum contract functions (#415).
- Update code generation to dedicated `ethereum` module in graph-ts (#409).
- Dependency updates: docker-compose, handlebars, jest, tern, keytar,
  request.
