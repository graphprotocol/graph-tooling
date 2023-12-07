# The Graph Tooling

Monorepo for various tools used by subgraph developers.

This repository houses the following tools:

<!-- prettier-ignore-start -->
| NPM | Name | 
| --- | --- | 
|[![npm (scoped)](https://img.shields.io/npm/v/@graphprotocol/graph-cli.svg?color=success)](https://www.npmjs.com/package/@graphprotocol/graph-cli)| [`@graphprotocol/graph-cli`](./packages/cli) |
[![npm (scoped)](https://img.shields.io/npm/v/@graphprotocol/graph-ts.svg?color=success)](https://www.npmjs.com/package/@graphprotocol/graph-ts)|[`@graphprotocol/graph-ts`](./packages/ts)|

<!-- prettier-ignore-end -->

## Contributing

We welcome contributions to this repository. Please see the
[contribution guidelines](CONTRIBUTING.md). For running the project locally,

1. Clone the repository
2. Make sure you have Node.js `>=20.x` installed
3. Make sure you have [`pnpm`] installed:
   [https://pnpm.io/installation](https://pnpm.io/installation)
4. Run `pnpm install` to install dependencies
5. Run `pnpm build` to build the packages

## Release process

We use `changeset` to manage releases. Every PR should include a changeset file. The release process
is as follows:

1. Author creates the PR with changes and runs `pnpm changeset` to create a changeset file to
   summarize the changes.
2. When the PR is merged to `main`, a Github Action will run and create a PR with the version bump
   and changelog.
3. We will merge the bot generated PR to `main`.
4. A Github Action will run and publish the new version to npm.

Helpful links:

- [Semver official docs](https://semver.org/)
- [Changesets](https://github.com/changesets/changesets)
- [Snapshot release](https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md)

### Stable release example

When PRs are merged and to `main` we can choose to merge the bot generated changeset PR to `main`
and it will publish a new version to npm.

Example of a `graph-client` release: https://github.com/graphprotocol/graph-client/pull/295

### Alpha release example

Every PR to `main` that includes a changeset file will create a new alpha version.

Example of `graph-client` snapshot release:
https://github.com/graphprotocol/graph-client/pull/178#issuecomment-1214822036

## License

Copyright &copy; 2018-2019 Graph Protocol, Inc. and contributors.

The Graph CLI is dual-licensed under the [MIT license](LICENSE-MIT) and the
[Apache License, Version 2.0](LICENSE-APACHE).

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either expressed or
implied. See the License for the specific language governing permissions and limitations under the
License.
