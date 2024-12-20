# @graphprotocol/graph-cli

## 0.93.3

### Patch Changes

- [#1875](https://github.com/graphprotocol/graph-tooling/pull/1875)
  [`675a89a`](https://github.com/graphprotocol/graph-tooling/commit/675a89a0f060f241f3da15542d6a7f497d5fcf5b)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - fix flag startup bug

## 0.93.2

### Patch Changes

- [#1871](https://github.com/graphprotocol/graph-tooling/pull/1871)
  [`5b312cf`](https://github.com/graphprotocol/graph-tooling/commit/5b312cf35bf4f77f36f3017e58805e9777bb8e5d)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Fix empty source name for substreams
  subgraphs #1868

- [#1863](https://github.com/graphprotocol/graph-tooling/pull/1863)
  [`4e70f64`](https://github.com/graphprotocol/graph-tooling/commit/4e70f64681a6c0158fa8287a77b8a79907d51b7d)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - warn about outdated node version

- [#1866](https://github.com/graphprotocol/graph-tooling/pull/1866)
  [`a4f0745`](https://github.com/graphprotocol/graph-tooling/commit/a4f074542a8ad9a4c783830e42702f309690418b)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - show skip-git deprecation warning
  only when used

- [#1867](https://github.com/graphprotocol/graph-tooling/pull/1867)
  [`f979e55`](https://github.com/graphprotocol/graph-tooling/commit/f979e553f5ed75513bc75b07231a717056312e96)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - error out if node is too old

- [#1865](https://github.com/graphprotocol/graph-tooling/pull/1865)
  [`4ddb562`](https://github.com/graphprotocol/graph-tooling/commit/4ddb56209361908804f366ec94266ec7f7dc079f)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - minor `graph init` ux improvements

## 0.93.1

### Patch Changes

- [#1859](https://github.com/graphprotocol/graph-tooling/pull/1859)
  [`71c8405`](https://github.com/graphprotocol/graph-tooling/commit/71c84056ef9fc29c4ca18ed82b9e1bad12fd20d9)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - `graph auth`: fix bug with setting
  deploy key

## 0.93.0

### Minor Changes

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Update all dependencies

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - - add networks registry support
  - improve `graph init` flow
    - filter through the networks as you type
    - more information about the networks
    - remove unnecessary options depending on the selection
    - ESC key to go back
  - allow specifying ipfs/url for substreams package

### Patch Changes

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - dependencies updates:

  - Updated dependency
    [`assemblyscript@0.19.23` ↗︎](https://www.npmjs.com/package/assemblyscript/v/0.19.23) (from
    `0.27.31`, in `dependencies`)

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Fix `graph add` flag parameters
  parsing

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - fix bug with clashing \_id field name
  in schema

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - fix generated example entity id
  uniqueness

- [#1849](https://github.com/graphprotocol/graph-tooling/pull/1849)
  [`00e0a83`](https://github.com/graphprotocol/graph-tooling/commit/00e0a830165a946749d12fdbcdc0ad00074a2ecd)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - rollback asc version

## 0.92.0

### Minor Changes

- [#1843](https://github.com/graphprotocol/graph-tooling/pull/1843)
  [`c09b56b`](https://github.com/graphprotocol/graph-tooling/commit/c09b56b093f23c80aa5d217b2fd56fccac061145)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Update all dependencies

- [#1843](https://github.com/graphprotocol/graph-tooling/pull/1843)
  [`c09b56b`](https://github.com/graphprotocol/graph-tooling/commit/c09b56b093f23c80aa5d217b2fd56fccac061145)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - - add networks registry support
  - improve `graph init` flow
    - filter through the networks as you type
    - more information about the networks
    - remove unnecessary options depending on the selection
    - ESC key to go back
  - allow specifying ipfs/url for substreams package

### Patch Changes

- [#1848](https://github.com/graphprotocol/graph-tooling/pull/1848)
  [`f2726cb`](https://github.com/graphprotocol/graph-tooling/commit/f2726cb4741ec87a4292088affbca554c252313a)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - dependencies updates:

  - Added dependency [`prettier@3.4.2` ↗︎](https://www.npmjs.com/package/prettier/v/3.4.2) (to
    `dependencies`)
  - Added dependency [`undici@7.1.1` ↗︎](https://www.npmjs.com/package/undici/v/7.1.1) (to
    `dependencies`)

- [#1843](https://github.com/graphprotocol/graph-tooling/pull/1843)
  [`c09b56b`](https://github.com/graphprotocol/graph-tooling/commit/c09b56b093f23c80aa5d217b2fd56fccac061145)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Fix `graph add` flag parameters
  parsing

- [#1843](https://github.com/graphprotocol/graph-tooling/pull/1843)
  [`c09b56b`](https://github.com/graphprotocol/graph-tooling/commit/c09b56b093f23c80aa5d217b2fd56fccac061145)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - fix bug with clashing \_id field name
  in schema

- [#1843](https://github.com/graphprotocol/graph-tooling/pull/1843)
  [`c09b56b`](https://github.com/graphprotocol/graph-tooling/commit/c09b56b093f23c80aa5d217b2fd56fccac061145)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - fix generated example entity id
  uniqueness

## 0.91.1

### Patch Changes

- [#1783](https://github.com/graphprotocol/graph-tooling/pull/1783)
  [`ea1d948`](https://github.com/graphprotocol/graph-tooling/commit/ea1d94863783e19a379ce6d545d5f8523d8bf9e8)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Fix bug with network selection

## 0.91.0

### Minor Changes

- [#1754](https://github.com/graphprotocol/graph-tooling/pull/1754)
  [`2050bf6`](https://github.com/graphprotocol/graph-tooling/commit/2050bf6259c19bd86a7446410c7e124dfaddf4cd)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add support for subgraph datasource and
  associated types.

- [#1781](https://github.com/graphprotocol/graph-tooling/pull/1781)
  [`e8218ee`](https://github.com/graphprotocol/graph-tooling/commit/e8218eedec4292a95957efc5cadcbcf5280c0375)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added rpc and api urls for
  botanix-testnet

## 0.90.1

### Patch Changes

- [#1776](https://github.com/graphprotocol/graph-tooling/pull/1776)
  [`c4c0590`](https://github.com/graphprotocol/graph-tooling/commit/c4c059029c391dd6e256a56b3b90bcf20b86680c)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - Fix testnet names for `abstract` and
  `corn`

## 0.90.0

### Minor Changes

- [`098b433`](https://github.com/graphprotocol/graph-tooling/commit/098b433815390e5aff2e0e52f22ab0ee44b9c206)
  Thanks [@DenisCarriere](https://github.com/DenisCarriere)! - Update deprecated endpoints and
  support API key for updating published subgraphs

### Patch Changes

- [#1771](https://github.com/graphprotocol/graph-tooling/pull/1771)
  [`93271b0`](https://github.com/graphprotocol/graph-tooling/commit/93271b07116752c74419720a39c1fdbd460c078d)
  Thanks [@0237h](https://github.com/0237h)! - Support parsing full path contract name from block
  explorers

- [#1774](https://github.com/graphprotocol/graph-tooling/pull/1774)
  [`5d9f0c9`](https://github.com/graphprotocol/graph-tooling/commit/5d9f0c9c9d714d95ed455deb02137ea5440f3e2d)
  Thanks [@0237h](https://github.com/0237h)! - Add new chains: `abstract-testnet`, `corn` and
  `corn-testnet`

- [#1767](https://github.com/graphprotocol/graph-tooling/pull/1767)
  [`6f2cb45`](https://github.com/graphprotocol/graph-tooling/commit/6f2cb45e5a07d8de2946a485763feb0b1bcfd4f0)
  Thanks [@0237h](https://github.com/0237h)! - Fix CLI validation for `startBlock` and
  `contractName` fetched from external APIs

## 0.89.0

### Minor Changes

- [#1763](https://github.com/graphprotocol/graph-tooling/pull/1763)
  [`58dbd28`](https://github.com/graphprotocol/graph-tooling/commit/58dbd2845b9e336bb06d7cee09929a92db7f2cf5)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - Add new chain: Lens testnet

### Patch Changes

- [#1759](https://github.com/graphprotocol/graph-tooling/pull/1759)
  [`1d4217a`](https://github.com/graphprotocol/graph-tooling/commit/1d4217a506b38307ad0d750a9abe37bffa0a734d)
  Thanks [@0237h](https://github.com/0237h)! - Refactor debug log for failed Etherscan ABI lookups

- [#1764](https://github.com/graphprotocol/graph-tooling/pull/1764)
  [`0b4cfe9`](https://github.com/graphprotocol/graph-tooling/commit/0b4cfe91091a86a0871d486f91754ea87f302b3e)
  Thanks [@adamazad](https://github.com/adamazad)! - chore(rpcs): update gnosis chain RPC endpoint

- [#1766](https://github.com/graphprotocol/graph-tooling/pull/1766)
  [`d2fda94`](https://github.com/graphprotocol/graph-tooling/commit/d2fda940ace2b719354df9da43890c559ebfd3a8)
  Thanks [@0237h](https://github.com/0237h)! - Improve ABI file path validation

- [#1761](https://github.com/graphprotocol/graph-tooling/pull/1761)
  [`baf36b4`](https://github.com/graphprotocol/graph-tooling/commit/baf36b42bc531f3aee2709c2f55682a7ec44e5ac)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - update soneium-testnet blockexplorer url

## 0.88.0

### Minor Changes

- [#1680](https://github.com/graphprotocol/graph-tooling/pull/1680)
  [`08914a8`](https://github.com/graphprotocol/graph-tooling/commit/08914a89179e31363765bb3a6e72945f4585e207)
  Thanks [@saihaj](https://github.com/saihaj)! - Breaking changes to the CLI to prepare for the
  sunset of the hosted service.

  - `graph auth`
    - Removed `--product` flag
    - Removed `--studio` flag
    - Removed `node` argument
  - `graph deploy`
    - Removed `--product` flag
    - Removed `--studio` flag
    - Removed `--from-hosted-service` flag
  - `graph init`
    - Removed `--product` flag
    - Removed `--studio` flag
    - Removed `--allow-simple-name` flag

- [#1749](https://github.com/graphprotocol/graph-tooling/pull/1749)
  [`bf43cbf`](https://github.com/graphprotocol/graph-tooling/commit/bf43cbf8283c53f0005d7cb9dfa681c92f3a6a91)
  Thanks [@0237h](https://github.com/0237h)! - Add warning for available CLI updates

### Patch Changes

- [#1751](https://github.com/graphprotocol/graph-tooling/pull/1751)
  [`0ba99dc`](https://github.com/graphprotocol/graph-tooling/commit/0ba99dcd6783fb20779d4f5a6791fc155969939e)
  Thanks [@0237h](https://github.com/0237h)! - Using `graph add` with `localhost` network now
  prompts the user for input

- [#1750](https://github.com/graphprotocol/graph-tooling/pull/1750)
  [`d764867`](https://github.com/graphprotocol/graph-tooling/commit/d764867dc7eab32e2f1db8505419ea4fa03ed503)
  Thanks [@0237h](https://github.com/0237h)! - Add prompt for existing directory in `init` flow

- [#1756](https://github.com/graphprotocol/graph-tooling/pull/1756)
  [`04bd901`](https://github.com/graphprotocol/graph-tooling/commit/04bd901d3ff974c197b82fd29426309ce7de1558)
  Thanks [@0237h](https://github.com/0237h)! - Fix `matic` RPC endpoint and improve error message

## 0.87.0

### Minor Changes

- [#1746](https://github.com/graphprotocol/graph-tooling/pull/1746)
  [`fef2e05`](https://github.com/graphprotocol/graph-tooling/commit/fef2e05c07d5f99f01834c4a6b9e063992d4bc2d)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - updated public rpc

## 0.86.0

### Minor Changes

- [#1740](https://github.com/graphprotocol/graph-tooling/pull/1740)
  [`7b4f787`](https://github.com/graphprotocol/graph-tooling/commit/7b4f787ebe4f65dbb233d3dda02f179f75ef21d9)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added new chain

## 0.85.0

### Minor Changes

- [#1733](https://github.com/graphprotocol/graph-tooling/pull/1733)
  [`d13bc5e`](https://github.com/graphprotocol/graph-tooling/commit/d13bc5e6ba08a62be78d1bf469fc0e3b89ee3c1a)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added rootstock

- [#1736](https://github.com/graphprotocol/graph-tooling/pull/1736)
  [`e759327`](https://github.com/graphprotocol/graph-tooling/commit/e759327cf53fe9462f9bdf65f5ff9fdd125f58db)
  Thanks [@fschoell](https://github.com/fschoell)! - replace etherscan endpoints

## 0.84.0

### Minor Changes

- [#1730](https://github.com/graphprotocol/graph-tooling/pull/1730)
  [`e39279b`](https://github.com/graphprotocol/graph-tooling/commit/e39279be9d61a97e79ea18e558bd73795e25dbe0)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added boba, fuse blockexplorer

## 0.83.0

### Minor Changes

- [#1728](https://github.com/graphprotocol/graph-tooling/pull/1728)
  [`a05db7b`](https://github.com/graphprotocol/graph-tooling/commit/a05db7bdf1f22f86501d9d59929245ddb7b1abae)
  Thanks [@yash251](https://github.com/yash251)! - add chiliz testnet rpc and api

## 0.82.0

### Minor Changes

- [#1726](https://github.com/graphprotocol/graph-tooling/pull/1726)
  [`81afd9b`](https://github.com/graphprotocol/graph-tooling/commit/81afd9b6edd09fa2df0d3ed7ae43b894472fca98)
  Thanks [@yash251](https://github.com/yash251)! - add chiliz rpc and api

## 0.81.0

### Minor Changes

- [#1719](https://github.com/graphprotocol/graph-tooling/pull/1719)
  [`2141242`](https://github.com/graphprotocol/graph-tooling/commit/21412420ad87579a1b884e17c190fc701f220623)
  Thanks [@yash251](https://github.com/yash251)! - add soneium api and rpc

## 0.80.1

### Patch Changes

- [#1715](https://github.com/graphprotocol/graph-tooling/pull/1715)
  [`4cfef44`](https://github.com/graphprotocol/graph-tooling/commit/4cfef44d991de6f9bbb802eb8956de5d63b2c2a3)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - fix: getcontractcreation support on neox
  etherscan api

## 0.80.0

### Minor Changes

- [#1712](https://github.com/graphprotocol/graph-tooling/pull/1712)
  [`9b48e45`](https://github.com/graphprotocol/graph-tooling/commit/9b48e455b258ecc4fba647e32773ee05b23b42eb)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - feat: add neox etherscan like url and
  public rpc

- [#1710](https://github.com/graphprotocol/graph-tooling/pull/1710)
  [`687bbd0`](https://github.com/graphprotocol/graph-tooling/commit/687bbd054265243d7f00376c69dd2a11cbb14116)
  Thanks [@yash251](https://github.com/yash251)! - add iotex testnet rpc and api url

- [#1713](https://github.com/graphprotocol/graph-tooling/pull/1713)
  [`4c7d17c`](https://github.com/graphprotocol/graph-tooling/commit/4c7d17c30fe7e87866e9002cae5d182bc8217eb5)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added publicRpc and blockExplorer for
  arbitrum nova

## 0.79.2

### Patch Changes

- [#1698](https://github.com/graphprotocol/graph-tooling/pull/1698)
  [`c8ec890`](https://github.com/graphprotocol/graph-tooling/commit/c8ec890cb13bb109bb97387e4819c948d97a079a)
  Thanks [@soilking](https://github.com/soilking)! - Fix build files being placed outside the build
  directory

## 0.79.1

### Patch Changes

- [#1701](https://github.com/graphprotocol/graph-tooling/pull/1701)
  [`24c402f`](https://github.com/graphprotocol/graph-tooling/commit/24c402f5f2f296a1df35d54fe1927030f96481d4)
  Thanks [@saihaj](https://github.com/saihaj)! - Allow publishing without forcing network or
  subgraph id

## 0.79.0

### Minor Changes

- [#1696](https://github.com/graphprotocol/graph-tooling/pull/1696)
  [`828bb04`](https://github.com/graphprotocol/graph-tooling/commit/828bb04125ad873ad675731e468d0c70009fea71)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added rpc & explorer urls for sei,
  gravity (mainnet & testnet), etherlink (mainnet)

## 0.78.0

### Minor Changes

- [#1692](https://github.com/graphprotocol/graph-tooling/pull/1692)
  [`6f84e7a`](https://github.com/graphprotocol/graph-tooling/commit/6f84e7ade5c51232abefcb9a6fb7406e375ad125)
  Thanks [@yash251](https://github.com/yash251)! - add iotex urls

## 0.77.0

### Minor Changes

- [#1690](https://github.com/graphprotocol/graph-tooling/pull/1690)
  [`87e74ce`](https://github.com/graphprotocol/graph-tooling/commit/87e74ce64a0c98e9be13d5f6fd31c7020ef23d5e)
  Thanks [@saihaj](https://github.com/saihaj)! - allow publishing new subgraph version

## 0.76.0

### Minor Changes

- [#1688](https://github.com/graphprotocol/graph-tooling/pull/1688)
  [`3a96771`](https://github.com/graphprotocol/graph-tooling/commit/3a9677113a4282cd4f91adadfa4b4b1d00f6e035)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - added rootstock blockexplorer api and
  public rpc url

## 0.75.0

### Minor Changes

- [#1686](https://github.com/graphprotocol/graph-tooling/pull/1686)
  [`fea8f23`](https://github.com/graphprotocol/graph-tooling/commit/fea8f23b745d2595708b7f5b86384ad7eaa16f08)
  Thanks [@alinobrasil](https://github.com/alinobrasil)! - getEtherscanLikeAPIUrl: added for sei
  mainnet (to be able to obtain contract ABI)

## 0.74.1

### Patch Changes

- [#1683](https://github.com/graphprotocol/graph-tooling/pull/1683)
  [`f5bfa07`](https://github.com/graphprotocol/graph-tooling/commit/f5bfa07e04c0c70ed3285db4e90bf99cfdb265a3)
  Thanks [@azf20](https://github.com/azf20)! - fix graph auth

## 0.74.0

### Minor Changes

- [#1681](https://github.com/graphprotocol/graph-tooling/pull/1681)
  [`0a16b41`](https://github.com/graphprotocol/graph-tooling/commit/0a16b41979bc0644a1599b9434d9f5bf30687f64)
  Thanks [@saihaj](https://github.com/saihaj)! - Part of the Hosted Service migration throw an error
  when users are trying to use `hosted-service` product in `graph [auth|deploy|init]` commands.

### Patch Changes

- [#1681](https://github.com/graphprotocol/graph-tooling/pull/1681)
  [`0a16b41`](https://github.com/graphprotocol/graph-tooling/commit/0a16b41979bc0644a1599b9434d9f5bf30687f64)
  Thanks [@saihaj](https://github.com/saihaj)! - remove ipfs check for studio deploys

## 0.73.0

### Minor Changes

- [#1670](https://github.com/graphprotocol/graph-tooling/pull/1670)
  [`03c907a`](https://github.com/graphprotocol/graph-tooling/commit/03c907acbddfb9f598c8e36bbc8b6c9b3a91a43a)
  Thanks [@saihaj](https://github.com/saihaj)! - Introduce `graph publish` command.

  Now you can publish your subgraphs directly from the CLI. This command will build your subgraph,
  deploy, prompt you to add metadata and then sign the transaction to publish it to the Graph
  Network.

  1. Build the subgraph and publish it to the network.

  ```sh
  graph publish
  ```

  2. Provide a IPFS Hash for the subgraph and publish it to the network.

  ```sh
  graph publish --ipfs <ipfs-hash>
  ```

  3. You can use a custom webapp url for deploying.

  ```sh
  graph publish --webapp-url <webapp-url>
  ```

### Patch Changes

- [#1670](https://github.com/graphprotocol/graph-tooling/pull/1670)
  [`03c907a`](https://github.com/graphprotocol/graph-tooling/commit/03c907acbddfb9f598c8e36bbc8b6c9b3a91a43a)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Added dependency [`open@8.4.2` ↗︎](https://www.npmjs.com/package/open/v/8.4.2) (to
    `dependencies`)

## 0.72.2

### Patch Changes

- [#1668](https://github.com/graphprotocol/graph-tooling/pull/1668)
  [`0e7b6cc`](https://github.com/graphprotocol/graph-tooling/commit/0e7b6cc3eb7e4aca4ba1e456e94ce37289d46b84)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - update etherscan api urls and rpc urls

## 0.72.1

### Patch Changes

- [`d9108ed`](https://github.com/graphprotocol/graph-tooling/commit/d9108ed779d37212d9bbfce791f6b2a6b6f9557f)
  Thanks [@saihaj](https://github.com/saihaj)! - get binaries published

## 0.72.0

### Minor Changes

- [#1664](https://github.com/graphprotocol/graph-tooling/pull/1664)
  [`c581b33`](https://github.com/graphprotocol/graph-tooling/commit/c581b338edf8eeec1675eb6987d77c1a50686816)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - auto fetch contract name from address

### Patch Changes

- [#1662](https://github.com/graphprotocol/graph-tooling/pull/1662)
  [`00e774e`](https://github.com/graphprotocol/graph-tooling/commit/00e774ed3a82e7b345d01b89b52e2c6615a94789)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - fix: update optimism-sepolia
  EtherscanLikeAPIUrl

- [#1661](https://github.com/graphprotocol/graph-tooling/pull/1661)
  [`8f6ee24`](https://github.com/graphprotocol/graph-tooling/commit/8f6ee241a4504ff912e943f6228d6195b117a815)
  Thanks [@mitchhs12](https://github.com/mitchhs12)! - add Linea Sepolia RPC and Linea Sepolia
  Etherscan url

## 0.71.2

### Patch Changes

- [#1611](https://github.com/graphprotocol/graph-tooling/pull/1611)
  [`951c2ed`](https://github.com/graphprotocol/graph-tooling/commit/951c2ed7db2f0650105c9b9059e0ccd8fd9102a0)
  Thanks [@lutter](https://github.com/lutter)! - Accept declared calls in subgraph manifests

## 0.71.1

### Patch Changes

- [`4d63b25`](https://github.com/graphprotocol/graph-tooling/commit/4d63b255b6bd0db5b79036bdf45596095dd8625b)
  Thanks [@saihaj](https://github.com/saihaj)! - fix etherscan like url for fuse

## 0.71.0

### Minor Changes

- [#1598](https://github.com/graphprotocol/graph-tooling/pull/1598)
  [`7d4208a`](https://github.com/graphprotocol/graph-tooling/commit/7d4208aa1a1d376d7b230df7d86d9ec5864e18a8)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Allow topic filters in event handlers

### Patch Changes

- [#1634](https://github.com/graphprotocol/graph-tooling/pull/1634)
  [`f256475`](https://github.com/graphprotocol/graph-tooling/commit/f2564757ba8007025f8745c9162ba4143ff58548)
  Thanks [@joshuanazareth97](https://github.com/joshuanazareth97)! - Order list of evm chains in
  graph init command

- [#1640](https://github.com/graphprotocol/graph-tooling/pull/1640)
  [`1fb675c`](https://github.com/graphprotocol/graph-tooling/commit/1fb675ce51076c5edbdb64c116b0d7feed0d939a)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - Added Etherscan like API url and Public RPC
  endpoints for Polygon Amoy,Gnosis Chiado,Mode Mainnet, Mode Sepolia chains for fetching startBlock
  and ABI

## 0.70.0

### Minor Changes

- [#1629](https://github.com/graphprotocol/graph-tooling/pull/1629)
  [`3801671`](https://github.com/graphprotocol/graph-tooling/commit/3801671a79875cdd8653b8603b1a2e89426268f5)
  Thanks [@saihaj](https://github.com/saihaj)! - generate gitignore file

## 0.69.2

### Patch Changes

- [#1623](https://github.com/graphprotocol/graph-tooling/pull/1623)
  [`121843e`](https://github.com/graphprotocol/graph-tooling/commit/121843e982c69ffb31aae911431a68a2349ea062)
  Thanks [@Shiyasmohd](https://github.com/Shiyasmohd)! - cli: added etherscan API URL & public RPC
  endpoint for etherlink-testnet

## 0.69.1

### Patch Changes

- [#1619](https://github.com/graphprotocol/graph-tooling/pull/1619)
  [`fb18ecf`](https://github.com/graphprotocol/graph-tooling/commit/fb18ecf657f77ab6d7325e264c4a6c66d237201d)
  Thanks [@saihaj](https://github.com/saihaj)! - increase jayson client timeout

## 0.69.0

### Minor Changes

- [#1522](https://github.com/graphprotocol/graph-tooling/pull/1522)
  [`d132f9c`](https://github.com/graphprotocol/graph-tooling/commit/d132f9c9f6ea5283e40a8d913f3abefe5a8ad5f8)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added support for handling GraphQL
  `Timestamp` scalar as `i64` (AssemblyScript)

- [#1610](https://github.com/graphprotocol/graph-tooling/pull/1610)
  [`fc03add`](https://github.com/graphprotocol/graph-tooling/commit/fc03add1a8510afa49110481b486c8fa56f8c19f)
  Thanks [@yehia67](https://github.com/yehia67)! - Generate `docker-compose.yml` with `graph init`
  command

## 0.68.5

### Patch Changes

- [`4525b0c`](https://github.com/graphprotocol/graph-tooling/commit/4525b0c3bbabe89561d5d908f23a8f5652f0df88)
  Thanks [@saihaj](https://github.com/saihaj)! - fix blast mainnet etherscan url

## 0.68.4

### Patch Changes

- [#1595](https://github.com/graphprotocol/graph-tooling/pull/1595)
  [`decff14`](https://github.com/graphprotocol/graph-tooling/commit/decff1435bdd3b4e459ffa83d881f23d26e2ee5f)
  Thanks [@saihaj](https://github.com/saihaj)! - improve error handling for `graph deploy`

## 0.68.3

### Patch Changes

- [#1593](https://github.com/graphprotocol/graph-tooling/pull/1593)
  [`5f78825`](https://github.com/graphprotocol/graph-tooling/commit/5f788250bbd50406b59b75cc82fee4b197b88e18)
  Thanks [@saihaj](https://github.com/saihaj)! - increase jayson client timeout

## 0.68.2

### Patch Changes

- [`5d39c18`](https://github.com/graphprotocol/graph-tooling/commit/5d39c180c3825bc4e7b869dc4ae10ebb4ac91f76)
  Thanks [@saihaj](https://github.com/saihaj)! - fix base sepolia url

## 0.68.1

### Patch Changes

- [#1589](https://github.com/graphprotocol/graph-tooling/pull/1589)
  [`7f0e8ab`](https://github.com/graphprotocol/graph-tooling/commit/7f0e8ab70bcd2279b54a040031de2795e7346b1a)
  Thanks [@saihaj](https://github.com/saihaj)! - fix optimism sepolia url

## 0.68.0

### Minor Changes

- [#1548](https://github.com/graphprotocol/graph-tooling/pull/1548)
  [`b3f6a99`](https://github.com/graphprotocol/graph-tooling/commit/b3f6a9979bcac9610807f19d41fc0548a5342828)
  Thanks [@lutter](https://github.com/lutter)! - Make validations more lenient to allow aggregations
  and Int8 ids

## 0.67.4

### Patch Changes

- [`f49aab9`](https://github.com/graphprotocol/graph-tooling/commit/f49aab98d643ba6d8c3708772bed8318825effed)
  Thanks [@saihaj](https://github.com/saihaj)! - fix blast testnet etherscan and RPC URL

## 0.67.3

### Patch Changes

- [#1579](https://github.com/graphprotocol/graph-tooling/pull/1579)
  [`bc61adb`](https://github.com/graphprotocol/graph-tooling/commit/bc61adb8ae4f6ba8b467e98ed390a96029b702d8)
  Thanks [@saihaj](https://github.com/saihaj)! - fix line and linea-goerli API URLs

## 0.67.2

### Patch Changes

- [#1571](https://github.com/graphprotocol/graph-tooling/pull/1571)
  [`76279ab`](https://github.com/graphprotocol/graph-tooling/commit/76279ab7afda5280a202818d64668c9e0873bb91)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Updated dependency [`gluegun@5.1.6` ↗︎](https://www.npmjs.com/package/gluegun/v/5.1.6) (from
    `5.1.2`, in `dependencies`)

- [#1572](https://github.com/graphprotocol/graph-tooling/pull/1572)
  [`d5ca0a6`](https://github.com/graphprotocol/graph-tooling/commit/d5ca0a61cb17fc17cbf18dbf0faf33cee5250a24)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Removed dependency [`request@2.88.2` ↗︎](https://www.npmjs.com/package/request/v/2.88.2) (from
    `dependencies`)

## 0.67.1

### Patch Changes

- [#1568](https://github.com/graphprotocol/graph-tooling/pull/1568)
  [`efa9444`](https://github.com/graphprotocol/graph-tooling/commit/efa94446d97b4137e942e3b9c138d83b2b8cf561)
  Thanks [@saihaj](https://github.com/saihaj)! - add zk sync sepolia RPC url

## 0.67.0

### Minor Changes

- [#1409](https://github.com/graphprotocol/graph-tooling/pull/1409)
  [`e15e036`](https://github.com/graphprotocol/graph-tooling/commit/e15e0361c38348f2ca20a89ab7a49ed2235922e7)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add support for endBlock in subgraph
  manifest

### Patch Changes

- [#1566](https://github.com/graphprotocol/graph-tooling/pull/1566)
  [`82bca91`](https://github.com/graphprotocol/graph-tooling/commit/82bca91aa0ca12af087f470b4637b92c3ee486c2)
  Thanks [@saihaj](https://github.com/saihaj)! - fix zksync-era-sepolia etherscan url

## 0.66.0

### Minor Changes

- [#1561](https://github.com/graphprotocol/graph-tooling/pull/1561)
  [`39d5dbf`](https://github.com/graphprotocol/graph-tooling/commit/39d5dbf091222921044f1044b7a94935fda46236)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add support for indexerHints in manifest

## 0.65.0

### Minor Changes

- [#1557](https://github.com/graphprotocol/graph-tooling/pull/1557)
  [`e84f233`](https://github.com/graphprotocol/graph-tooling/commit/e84f233ee156863136b120a79a91ec692a6f5677)
  Thanks [@saihaj](https://github.com/saihaj)! - fetch supported networks from API

## 0.64.1

### Patch Changes

- [#1536](https://github.com/graphprotocol/graph-tooling/pull/1536)
  [`fbce626`](https://github.com/graphprotocol/graph-tooling/commit/fbce626ddd9206f9887576b1a023d9b98914e6a9)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Updated dependency [`prettier@3.0.3` ↗︎](https://www.npmjs.com/package/prettier/v/3.0.3) (from
    `1.19.1`, in `dependencies`)

## 0.64.0

### Minor Changes

- [#1533](https://github.com/graphprotocol/graph-tooling/pull/1533)
  [`45f3197`](https://github.com/graphprotocol/graph-tooling/commit/45f319773276ba14efb0623f7b22232ef76b685a)
  Thanks [@saihaj](https://github.com/saihaj)! - adding deprecation notices for commands we plan to
  change in the next major. See https://github.com/graphprotocol/graph-tooling/issues/1487

### Patch Changes

- [#1545](https://github.com/graphprotocol/graph-tooling/pull/1545)
  [`1cfc8ce`](https://github.com/graphprotocol/graph-tooling/commit/1cfc8ce67388ebb9c6dcb1195119959ecd9be325)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Removed dependency
    [`@babel/core@^7.20.5` ↗︎](https://www.npmjs.com/package/@babel/core/v/7.20.5) (from
    `dependencies`)
  - Removed dependency
    [`@babel/preset-typescript@^7.18.6` ↗︎](https://www.npmjs.com/package/@babel/preset-typescript/v/7.18.6)
    (from `dependencies`)
  - Removed dependency [`memoizee@^0.4.15` ↗︎](https://www.npmjs.com/package/memoizee/v/0.4.15)
    (from `dependencies`)

- [#1545](https://github.com/graphprotocol/graph-tooling/pull/1545)
  [`1cfc8ce`](https://github.com/graphprotocol/graph-tooling/commit/1cfc8ce67388ebb9c6dcb1195119959ecd9be325)
  Thanks [@saihaj](https://github.com/saihaj)! - fix call handler validation

## 0.63.1

### Patch Changes

- [#1539](https://github.com/graphprotocol/graph-tooling/pull/1539)
  [`3e29dfd`](https://github.com/graphprotocol/graph-tooling/commit/3e29dfdf0175634246aca5d2b57328cdd32ea45a)
  Thanks [@saihaj](https://github.com/saihaj)! - upgrade `graph init` to use latest version of
  `graph-ts`

- [#1540](https://github.com/graphprotocol/graph-tooling/pull/1540)
  [`8a79d05`](https://github.com/graphprotocol/graph-tooling/commit/8a79d0501dfb95452f198b6744c459716d112275)
  Thanks [@saihaj](https://github.com/saihaj)! - fix graph build for templates

## 0.63.0

### Minor Changes

- [#1531](https://github.com/graphprotocol/graph-tooling/pull/1531)
  [`b168be1`](https://github.com/graphprotocol/graph-tooling/commit/b168be1526376fbb386b2ef650813b6696ab59f1)
  Thanks [@travs](https://github.com/travs)! - Add `--skip-git` option to `init` cli command

- [#1490](https://github.com/graphprotocol/graph-tooling/pull/1490)
  [`95eb9d0`](https://github.com/graphprotocol/graph-tooling/commit/95eb9d0244a99fdfb7a4750963c1a982d024dd87)
  Thanks [@mangas](https://github.com/mangas)! - substreams based triggers support

- [#1535](https://github.com/graphprotocol/graph-tooling/pull/1535)
  [`7d5c818`](https://github.com/graphprotocol/graph-tooling/commit/7d5c818fc832cf824421957b02ff3198bcf25a22)
  Thanks [@saihaj](https://github.com/saihaj)! - add validation for handlers from subgraph manifest

- [#1524](https://github.com/graphprotocol/graph-tooling/pull/1524)
  [`086a2da`](https://github.com/graphprotocol/graph-tooling/commit/086a2da03a4388277b69b6db541a0673dc9505bb)
  Thanks [@pedropregueiro](https://github.com/pedropregueiro)! - Add support for M3 apple silicon
  for `graph test`

### Patch Changes

- [#1535](https://github.com/graphprotocol/graph-tooling/pull/1535)
  [`7d5c818`](https://github.com/graphprotocol/graph-tooling/commit/7d5c818fc832cf824421957b02ff3198bcf25a22)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Added dependency [`@babel/core@^7.20.5` ↗︎](https://www.npmjs.com/package/@babel/core/v/7.20.5)
    (to `dependencies`)
  - Added dependency
    [`@babel/preset-typescript@^7.18.6` ↗︎](https://www.npmjs.com/package/@babel/preset-typescript/v/7.18.6)
    (to `dependencies`)
  - Added dependency [`memoizee@^0.4.15` ↗︎](https://www.npmjs.com/package/memoizee/v/0.4.15) (to
    `dependencies`)

- [#1521](https://github.com/graphprotocol/graph-tooling/pull/1521)
  [`3571a57`](https://github.com/graphprotocol/graph-tooling/commit/3571a571b2a094f41932e7cbc91b605c7ba0962c)
  Thanks [@saihaj](https://github.com/saihaj)! - remove studio network validation checks

## 0.62.0

### Minor Changes

- [#1500](https://github.com/graphprotocol/graph-tooling/pull/1500)
  [`4b92a5e`](https://github.com/graphprotocol/graph-tooling/commit/4b92a5ef87661a39021d5945a427d32d3a2873b2)
  Thanks [@saihaj](https://github.com/saihaj)! - upgrade to Node 20

### Patch Changes

- [#1461](https://github.com/graphprotocol/graph-tooling/pull/1461)
  [`cbbb0fc`](https://github.com/graphprotocol/graph-tooling/commit/cbbb0fc2050019c705f25f59a2bbb6a8ff9b7c32)
  Thanks [@saihaj](https://github.com/saihaj)! - include user agent for CLI fetch calls

- [#1508](https://github.com/graphprotocol/graph-tooling/pull/1508)
  [`f5ffcf1`](https://github.com/graphprotocol/graph-tooling/commit/f5ffcf12bf9241c948b8d0b0d023416f66b68d7f)
  Thanks [@saihaj](https://github.com/saihaj)! - respect `--protocol` and `--network` provided from
  flags of `graph init`

- [#1461](https://github.com/graphprotocol/graph-tooling/pull/1461)
  [`cbbb0fc`](https://github.com/graphprotocol/graph-tooling/commit/cbbb0fc2050019c705f25f59a2bbb6a8ff9b7c32)
  Thanks [@saihaj](https://github.com/saihaj)! - send graph cli version as user agent for all third
  party API calls

- [#1461](https://github.com/graphprotocol/graph-tooling/pull/1461)
  [`cbbb0fc`](https://github.com/graphprotocol/graph-tooling/commit/cbbb0fc2050019c705f25f59a2bbb6a8ff9b7c32)
  Thanks [@saihaj](https://github.com/saihaj)! - send graph cli version as user agent for all ipfs
  requests

- [#1503](https://github.com/graphprotocol/graph-tooling/pull/1503)
  [`4fa0ace`](https://github.com/graphprotocol/graph-tooling/commit/4fa0ace140b5d03cae9419c8b9eba529bb33cb41)
  Thanks [@saihaj](https://github.com/saihaj)! - sanitize special characters in codegeneration

- [#1504](https://github.com/graphprotocol/graph-tooling/pull/1504)
  [`8b509ec`](https://github.com/graphprotocol/graph-tooling/commit/8b509ecd6d7cc28888eb054c03ae7de56ba8c288)
  Thanks [@saihaj](https://github.com/saihaj)! - dedupe imports in codegen

## 0.61.0

### Minor Changes

- [#1491](https://github.com/graphprotocol/graph-tooling/pull/1491)
  [`326b303`](https://github.com/graphprotocol/graph-tooling/commit/326b30340ed5d922bfde995c9ff68e0899ac4cb3)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - add etherscan api retries to
  `graph init` wizard

- [#1489](https://github.com/graphprotocol/graph-tooling/pull/1489)
  [`031fca8`](https://github.com/graphprotocol/graph-tooling/commit/031fca87fb163a69a06653f7822f4738452a91aa)
  Thanks [@saihaj](https://github.com/saihaj)! - Arbitrum Sepolia support

- [#1493](https://github.com/graphprotocol/graph-tooling/pull/1493)
  [`f5f974d`](https://github.com/graphprotocol/graph-tooling/commit/f5f974d63416ba845c45c50b2931c9beffcca3a1)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Fix codegen issues when using derived
  loaders with Bytes as ID's

## 0.60.0

### Minor Changes

- [#1474](https://github.com/graphprotocol/graph-tooling/pull/1474)
  [`6aacb7c`](https://github.com/graphprotocol/graph-tooling/commit/6aacb7c68e72817dea642e19c03159076e42d289)
  Thanks [@pranavdaa](https://github.com/pranavdaa)! - add scroll mainnet support

## 0.59.0

### Minor Changes

- [#1457](https://github.com/graphprotocol/graph-tooling/pull/1457)
  [`b7dc8a5`](https://github.com/graphprotocol/graph-tooling/commit/b7dc8a5fe32d0241f2bef5f118a9e1de819b61a9)
  Thanks [@saihaj](https://github.com/saihaj)! - do not generate loader for interfaces

### Patch Changes

- [#1470](https://github.com/graphprotocol/graph-tooling/pull/1470)
  [`4c1ca35`](https://github.com/graphprotocol/graph-tooling/commit/4c1ca35d7c5cf6ee3aae119d578978e55074f5e9)
  Thanks [@axiomatic-aardvark](https://github.com/axiomatic-aardvark)! - Update 'test' command to
  reflect new matchstick version

- [#1458](https://github.com/graphprotocol/graph-tooling/pull/1458)
  [`05e61d2`](https://github.com/graphprotocol/graph-tooling/commit/05e61d212caf8bdb735e8527dbbab6a0beca516d)
  Thanks [@saihaj](https://github.com/saihaj)! - do not init a git repo if a repo already exists

- [#1462](https://github.com/graphprotocol/graph-tooling/pull/1462)
  [`b5f28bc`](https://github.com/graphprotocol/graph-tooling/commit/b5f28bc33a43b84ce4b6fe004c553e4de5e896a6)
  Thanks [@omahs](https://github.com/omahs)! - deprecate `--skip-wait-for-etherium` for
  `graph local`

- [#1459](https://github.com/graphprotocol/graph-tooling/pull/1459)
  [`129d003`](https://github.com/graphprotocol/graph-tooling/commit/129d003838b9b138391835f5a03b21aa05c34e15)
  Thanks [@pustovalov](https://github.com/pustovalov)! - fix ABI api endpoint aurora networks

## 0.58.0

### Minor Changes

- [#1434](https://github.com/graphprotocol/graph-tooling/pull/1434)
  [`e54883b`](https://github.com/graphprotocol/graph-tooling/commit/e54883b41997eee408d66fd2bc835c67cb3c7e40)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add data source context support in ethereum
  manifest

## 0.57.0

### Minor Changes

- [#1439](https://github.com/graphprotocol/graph-tooling/pull/1439)
  [`b583097`](https://github.com/graphprotocol/graph-tooling/commit/b583097f464a478151068d96d668334602bed3ba)
  Thanks [@saihaj](https://github.com/saihaj)! - Enable autocomplete for CLI commands. To configure
  run

  ```bash
  graph autocomplete
  ```

  and follow the steps in the prompt.

- [#1441](https://github.com/graphprotocol/graph-tooling/pull/1441)
  [`2e656e9`](https://github.com/graphprotocol/graph-tooling/commit/2e656e9cdaaea6d87866adaa142da597fcd7ce65)
  Thanks [@saihaj](https://github.com/saihaj)! - show suggestions when an invalid command is entered

### Patch Changes

- [#1439](https://github.com/graphprotocol/graph-tooling/pull/1439)
  [`b583097`](https://github.com/graphprotocol/graph-tooling/commit/b583097f464a478151068d96d668334602bed3ba)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Added dependency
    [`@oclif/plugin-autocomplete@^2.3.6` ↗︎](https://www.npmjs.com/package/@oclif/plugin-autocomplete/v/2.3.6)
    (to `dependencies`)

- [#1441](https://github.com/graphprotocol/graph-tooling/pull/1441)
  [`2e656e9`](https://github.com/graphprotocol/graph-tooling/commit/2e656e9cdaaea6d87866adaa142da597fcd7ce65)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Added dependency
    [`@oclif/plugin-not-found@^2.4.0` ↗︎](https://www.npmjs.com/package/@oclif/plugin-not-found/v/2.4.0)
    (to `dependencies`)

- [#1435](https://github.com/graphprotocol/graph-tooling/pull/1435)
  [`f05b47c`](https://github.com/graphprotocol/graph-tooling/commit/f05b47cf64912d0c66255c9f0076f1696a708ff2)
  Thanks [@saihaj](https://github.com/saihaj)! - update prettier

- [#1433](https://github.com/graphprotocol/graph-tooling/pull/1433)
  [`4492e4f`](https://github.com/graphprotocol/graph-tooling/commit/4492e4fdefb48407ef89df82eeef4d92bb0747e9)
  Thanks [@saihaj](https://github.com/saihaj)! - when generating nested tuples make sure they are
  non-nullable

- [#1433](https://github.com/graphprotocol/graph-tooling/pull/1433)
  [`4492e4f`](https://github.com/graphprotocol/graph-tooling/commit/4492e4fdefb48407ef89df82eeef4d92bb0747e9)
  Thanks [@saihaj](https://github.com/saihaj)! - 2D arrays are valid entities

## 0.56.0

### Minor Changes

- [#1421](https://github.com/graphprotocol/graph-tooling/pull/1421)
  [`d4d5c90`](https://github.com/graphprotocol/graph-tooling/commit/d4d5c904bdec451001f058598527895dee0a5b4c)
  Thanks [@pranavdaa](https://github.com/pranavdaa)! - Add Scroll testnet to graph-cli

- [#1392](https://github.com/graphprotocol/graph-tooling/pull/1392)
  [`7bc5e4e`](https://github.com/graphprotocol/graph-tooling/commit/7bc5e4e5139100e26b36df607f0b847e8a0b5f96)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add support for polling block handlers in
  the manifest for ethereum

## 0.55.0

### Minor Changes

- [#1419](https://github.com/graphprotocol/graph-tooling/pull/1419)
  [`e88ff02`](https://github.com/graphprotocol/graph-tooling/commit/e88ff02cd236f6c556afd99cecb00b6cffd738ed)
  Thanks [@saihaj](https://github.com/saihaj)! - Introduce `--from-hosted-service` flag which will
  make it easier to deploy subgraphs from hosted service to Studio.

- [#1418](https://github.com/graphprotocol/graph-tooling/pull/1418)
  [`38c16be`](https://github.com/graphprotocol/graph-tooling/commit/38c16be4ed865bec12a4db63b219dba058f06e72)
  Thanks [@uF4No](https://github.com/uF4No)! - feat: adds zksync era testnet

## 0.54.0

### Minor Changes

- [#1411](https://github.com/graphprotocol/graph-tooling/pull/1411)
  [`0ae0625`](https://github.com/graphprotocol/graph-tooling/commit/0ae06258b31c979c8e83922be77021bc004a0d12)
  Thanks [@saihaj](https://github.com/saihaj)! - add support for arweave file datasource

- [#1407](https://github.com/graphprotocol/graph-tooling/pull/1407)
  [`d388127`](https://github.com/graphprotocol/graph-tooling/commit/d388127aa46a47feaab5024d0a2f2da49c9cabac)
  Thanks [@saihaj](https://github.com/saihaj)! - add skipInstall flag for init

### Patch Changes

- [#1410](https://github.com/graphprotocol/graph-tooling/pull/1410)
  [`c1eed12`](https://github.com/graphprotocol/graph-tooling/commit/c1eed1219b015145bd428c201577659c61ab64bc)
  Thanks [@uF4No](https://github.com/uF4No)! - fix ABI api endpoint zksync mainnet

## 0.53.0

### Minor Changes

- [#1406](https://github.com/graphprotocol/graph-tooling/pull/1406)
  [`faefa94`](https://github.com/graphprotocol/graph-tooling/commit/faefa94b6d4ff48de444b3ed33cc3d4b01d2eccc)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Fix derived loaders not working failing for
  entities with Bytes as ID's

### Patch Changes

- [#1400](https://github.com/graphprotocol/graph-tooling/pull/1400)
  [`e7423aa`](https://github.com/graphprotocol/graph-tooling/commit/e7423aa5a73a5b8a7919f92c558c49fe61be9c23)
  Thanks [@saihaj](https://github.com/saihaj)! - only update `network.json` file during `graph add`
  if it exists

- [#1402](https://github.com/graphprotocol/graph-tooling/pull/1402)
  [`f0ce6c0`](https://github.com/graphprotocol/graph-tooling/commit/f0ce6c00e8adab94847ee3f9fde187513583b86c)
  Thanks [@saihaj](https://github.com/saihaj)! - show a descriptive error message and do not hang if
  there is a deploy key issue

- [#1403](https://github.com/graphprotocol/graph-tooling/pull/1403)
  [`dfa9ee1`](https://github.com/graphprotocol/graph-tooling/commit/dfa9ee1184bb1af499289baa92eb8c3b3cf37f85)
  Thanks [@saihaj](https://github.com/saihaj)! - do not ask for local path when trying to add more
  contracts during init

- [#1400](https://github.com/graphprotocol/graph-tooling/pull/1400)
  [`e7423aa`](https://github.com/graphprotocol/graph-tooling/commit/e7423aa5a73a5b8a7919f92c558c49fe61be9c23)
  Thanks [@saihaj](https://github.com/saihaj)! - ask for start block in `graph add` if we cannot
  fetch the start block from etherscan

## 0.52.0

### Minor Changes

- [#1398](https://github.com/graphprotocol/graph-tooling/pull/1398)
  [`3e71375`](https://github.com/graphprotocol/graph-tooling/commit/3e713756dbe71185cdc5f9e222a6892d20f977ed)
  Thanks [@pranavdaa](https://github.com/pranavdaa)! - Adding base mainnet to staging

### Patch Changes

- [#1393](https://github.com/graphprotocol/graph-tooling/pull/1393)
  [`609954d`](https://github.com/graphprotocol/graph-tooling/commit/609954dc57114a42add6ef6d5db006b22d5e98bb)
  Thanks [@saihaj](https://github.com/saihaj)! - ensure we use studio when loading from example

- [#1393](https://github.com/graphprotocol/graph-tooling/pull/1393)
  [`609954d`](https://github.com/graphprotocol/graph-tooling/commit/609954dc57114a42add6ef6d5db006b22d5e98bb)
  Thanks [@saihaj](https://github.com/saihaj)! - skip validation for subgraph name when creating an
  example

## 0.51.2

### Patch Changes

- [#1347](https://github.com/graphprotocol/graph-tooling/pull/1347)
  [`b442a11`](https://github.com/graphprotocol/graph-tooling/commit/b442a111fa2b00df59faf655e5199a8b5248b518)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.6` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.6)
    (from `2.8.4`, in `dependencies`)

- [#1384](https://github.com/graphprotocol/graph-tooling/pull/1384)
  [`16252be`](https://github.com/graphprotocol/graph-tooling/commit/16252bedd46dd7e421b32c6b7e7a0019692fc8a4)
  Thanks [@saihaj](https://github.com/saihaj)! - do not crash for codegen when it is substreams

- [#1382](https://github.com/graphprotocol/graph-tooling/pull/1382)
  [`d2a1aa6`](https://github.com/graphprotocol/graph-tooling/commit/d2a1aa6faec41a1b08035caf58113669963f5919)
  Thanks [@saihaj](https://github.com/saihaj)! - Only ask directory and subgraph name when using
  `graph init --from-example ...`

## 0.51.1

### Patch Changes

- [#1369](https://github.com/graphprotocol/graph-tooling/pull/1369)
  [`18e5c29`](https://github.com/graphprotocol/graph-tooling/commit/18e5c29fdd83d17614d2ce2207299b8d78c7949f)
  Thanks [@azf20](https://github.com/azf20)! - fix: always create output directory on building a
  subgraph

## 0.51.0

### Minor Changes

- [#1340](https://github.com/graphprotocol/graph-tooling/pull/1340)
  [`2375877`](https://github.com/graphprotocol/graph-tooling/commit/23758774b33b5b7c6934f57a3e137870205ca6f0)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add support for codegen for derived field
  loaders, This adds getters for derived fields defined in the schema for entities.

- [#1363](https://github.com/graphprotocol/graph-tooling/pull/1363)
  [`f928262`](https://github.com/graphprotocol/graph-tooling/commit/f9282626d7e906cfdc0fc826bdbc92ff2c907e97)
  Thanks [@saihaj](https://github.com/saihaj)! - add `graph clean` command to delete generated
  artifacts

- [#1296](https://github.com/graphprotocol/graph-tooling/pull/1296)
  [`dab4ca1`](https://github.com/graphprotocol/graph-tooling/commit/dab4ca1f5df7dcd0928bbaa20304f41d23b20ced)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added support for handling GraphQL `Int8`
  scalar as `i64` (AssemblyScript)

## 0.50.1

### Patch Changes

- [#1356](https://github.com/graphprotocol/graph-tooling/pull/1356)
  [`b7f8fba`](https://github.com/graphprotocol/graph-tooling/commit/b7f8fbabbfa36cf2eb817574fa143a58a1e2be33)
  Thanks [@saihaj](https://github.com/saihaj)! - use bytes array instead of from array

- [#1357](https://github.com/graphprotocol/graph-tooling/pull/1357)
  [`394d48b`](https://github.com/graphprotocol/graph-tooling/commit/394d48bc67b3f25ae45490d4d26d0a51c2ab08fe)
  Thanks [@saihaj](https://github.com/saihaj)! - upgrade to latest graph-ts version

## 0.50.0

### Minor Changes

- [#1353](https://github.com/graphprotocol/graph-tooling/pull/1353)
  [`125c687`](https://github.com/graphprotocol/graph-tooling/commit/125c6874e9d2fb67bf9f0211e9f9f306bc6fe55c)
  Thanks [@saihaj](https://github.com/saihaj)! - Add a new `--ipfs-hash` flag to `graph deploy`
  allowing to deploy a subgraph that is already compiled and uploaded to IPFS.

- [#1335](https://github.com/graphprotocol/graph-tooling/pull/1335)
  [`7343f50`](https://github.com/graphprotocol/graph-tooling/commit/7343f50c0e2b767de04909e6020b88fea97ae3cd)
  Thanks [@saihaj](https://github.com/saihaj)! - For substreams generate the directory tree as
  follows

  ```
  .
  ├── package.json
  ├── schema.graphql
  └── subgraph.yaml
  ```

  In the `package.json` we only depend on the CLI since that is what developer will use to deploy
  the subgraph. The `schema.graphql` is the schema of the subgraph and the `subgraph.yaml` is the
  manifest file for the subgraph.

- [#1335](https://github.com/graphprotocol/graph-tooling/pull/1335)
  [`7343f50`](https://github.com/graphprotocol/graph-tooling/commit/7343f50c0e2b767de04909e6020b88fea97ae3cd)
  Thanks [@saihaj](https://github.com/saihaj)! - respect --abi flag instead of loading from
  etherscan

- [#1335](https://github.com/graphprotocol/graph-tooling/pull/1335)
  [`7343f50`](https://github.com/graphprotocol/graph-tooling/commit/7343f50c0e2b767de04909e6020b88fea97ae3cd)
  Thanks [@saihaj](https://github.com/saihaj)! - remove index events as entities for substreams

- [#1335](https://github.com/graphprotocol/graph-tooling/pull/1335)
  [`7343f50`](https://github.com/graphprotocol/graph-tooling/commit/7343f50c0e2b767de04909e6020b88fea97ae3cd)
  Thanks [@saihaj](https://github.com/saihaj)! - remove start block selection for substreams

- [#1343](https://github.com/graphprotocol/graph-tooling/pull/1343)
  [`032d703`](https://github.com/graphprotocol/graph-tooling/commit/032d7039fbfec7505d9c3bbefe43a76a8f2895de)
  Thanks [@saihaj](https://github.com/saihaj)! - add SPK input for substreams protocol

### Patch Changes

- [#1335](https://github.com/graphprotocol/graph-tooling/pull/1335)
  [`7343f50`](https://github.com/graphprotocol/graph-tooling/commit/7343f50c0e2b767de04909e6020b88fea97ae3cd)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.4` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.4)
    (from `2.8.2`, in `dependencies`)
  - Updated dependency [`gluegun@5.1.2` ↗︎](https://www.npmjs.com/package/gluegun/v/5.1.2) (from
    `https://github.com/edgeandnode/gluegun#v4.3.1-pin-colors-dep`, in `dependencies`)

- [#1351](https://github.com/graphprotocol/graph-tooling/pull/1351)
  [`c7cf89c`](https://github.com/graphprotocol/graph-tooling/commit/c7cf89c2b7b60b39bd89473d8440ece2acdcb9a3)
  Thanks [@saihaj](https://github.com/saihaj)! - return tuple arrays as a Bytes array in GraphQL

- [#1329](https://github.com/graphprotocol/graph-tooling/pull/1329)
  [`308cb8a`](https://github.com/graphprotocol/graph-tooling/commit/308cb8af3fb2cabbad08f409d77481994a95865c)
  Thanks [@saihaj](https://github.com/saihaj)! - Point to new examples repo instead of old

## 0.49.0

### Minor Changes

- [#1327](https://github.com/graphprotocol/graph-tooling/pull/1327)
  [`a70ac44`](https://github.com/graphprotocol/graph-tooling/commit/a70ac44575a486128fafd3ee9e9e6fbb05bc642e)
  Thanks [@saihaj](https://github.com/saihaj)! - do not generate types, instead show a message to
  user to use substreams CLI for codegen.

- [#1306](https://github.com/graphprotocol/graph-tooling/pull/1306)
  [`f5e4b58`](https://github.com/graphprotocol/graph-tooling/commit/f5e4b58989edc5f3bb8211f1b912449e77832de8)
  Thanks [@saihaj](https://github.com/saihaj)! - Add loadInBlock function for entities as part of
  codegen

- [#1339](https://github.com/graphprotocol/graph-tooling/pull/1339)
  [`214cd71`](https://github.com/graphprotocol/graph-tooling/commit/214cd7153aabd427b52c87f5f3643212cb615913)
  Thanks [@saihaj](https://github.com/saihaj)! - allow deploy optimism and optimism-goerli on studio

### Patch Changes

- [#1328](https://github.com/graphprotocol/graph-tooling/pull/1328)
  [`4963215`](https://github.com/graphprotocol/graph-tooling/commit/4963215564797393424c563ea0b51aabbfd8e33e)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.4` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.4)
    (from `2.8.2`, in `dependencies`)

- [#1331](https://github.com/graphprotocol/graph-tooling/pull/1331)
  [`b2c8dec`](https://github.com/graphprotocol/graph-tooling/commit/b2c8decb7806d25df6ca4e07f6dfdf7941516435)
  Thanks [@saihaj](https://github.com/saihaj)! - only allow mainnet for substreams in network
  selection for init

## 0.48.0

### Minor Changes

- [#1257](https://github.com/graphprotocol/graph-tooling/pull/1257)
  [`17b90d7`](https://github.com/graphprotocol/graph-tooling/commit/17b90d7e2d4abdd850755adc4630975fd2b957e7)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bundle CLI as binary

## 0.47.2

### Patch Changes

- [#1308](https://github.com/graphprotocol/graph-tooling/pull/1308)
  [`dd765f4`](https://github.com/graphprotocol/graph-tooling/commit/dd765f4beb9e4964718b03428b39541bc48e6025)
  Thanks [@saihaj](https://github.com/saihaj)! - allow `fantom` and `matic`

## 0.47.1

### Patch Changes

- [#1303](https://github.com/graphprotocol/graph-tooling/pull/1303)
  [`327784f`](https://github.com/graphprotocol/graph-tooling/commit/327784ff79c458c603dbac4b9dfd1f4e5aab6c8c)
  Thanks [@dimitrovmaksim](https://github.com/dimitrovmaksim)! - Fixes 403 Forbidden response when
  fetching the latest matchstick tag

## 0.47.0

### Minor Changes

- [#1284](https://github.com/graphprotocol/graph-tooling/pull/1284)
  [`b4311d8`](https://github.com/graphprotocol/graph-tooling/commit/b4311d86fbfd8c6cfd7a1c894a7dbdb4942b627c)
  Thanks [@saihaj](https://github.com/saihaj)! - Changing code generation so we reduce the non-null
  assertions for primitive types. This way we can return null for primitive types and still have the
  generated code compile.

- [#1293](https://github.com/graphprotocol/graph-tooling/pull/1293)
  [`9ae82b5`](https://github.com/graphprotocol/graph-tooling/commit/9ae82b5adbd422ef7ccc13e6e647447a0ec691d5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Include declaration files

- [#1258](https://github.com/graphprotocol/graph-tooling/pull/1258)
  [`86e1fda`](https://github.com/graphprotocol/graph-tooling/commit/86e1fdab685d35fc4baa66db62be42eb4a1d9ebf)
  Thanks [@saihaj](https://github.com/saihaj)! - validate existence for handlers specified in
  manifest during build

- [#1294](https://github.com/graphprotocol/graph-tooling/pull/1294)
  [`e5c1fbc`](https://github.com/graphprotocol/graph-tooling/commit/e5c1fbc37e437f3249fd210b0ae7a2b1d6b70e6d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Prompt deploy command for subgraph name and
  select product

### Patch Changes

- [#1266](https://github.com/graphprotocol/graph-tooling/pull/1266)
  [`0bc47bd`](https://github.com/graphprotocol/graph-tooling/commit/0bc47bd92031b3dab48ff87fc9be20ac2ee35d96)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`glob@9.3.5` ↗︎](https://www.npmjs.com/package/glob/v/9.3.5) (from `9.3.4`,
    in `dependencies`)

- [#1273](https://github.com/graphprotocol/graph-tooling/pull/1273)
  [`83d7a08`](https://github.com/graphprotocol/graph-tooling/commit/83d7a084e529aa87c6b05b21a35c92c1c8ddb7fc)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`semver@7.4.0` ↗︎](https://www.npmjs.com/package/semver/v/7.4.0) (from
    `7.3.8`, in `dependencies`)

- [#1279](https://github.com/graphprotocol/graph-tooling/pull/1279)
  [`1f8b9c9`](https://github.com/graphprotocol/graph-tooling/commit/1f8b9c99456b8be12953ff31cf5c27672a89a90d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.1` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.1)
    (from `2.8.0`, in `dependencies`)

- [#1288](https://github.com/graphprotocol/graph-tooling/pull/1288)
  [`7090159`](https://github.com/graphprotocol/graph-tooling/commit/7090159be5b40ec78702ce9c870536f4fb7e048d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.2` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.2)
    (from `2.8.1`, in `dependencies`)

- [#1259](https://github.com/graphprotocol/graph-tooling/pull/1259)
  [`5ccb466`](https://github.com/graphprotocol/graph-tooling/commit/5ccb466019d4d3de693f5b7a89898b1598c6c4be)
  Thanks [@saihaj](https://github.com/saihaj)! - refactor out immutable.js usage from schema
  generation

- [#1291](https://github.com/graphprotocol/graph-tooling/pull/1291)
  [`2164a20`](https://github.com/graphprotocol/graph-tooling/commit/2164a20aefdc22e3e99021d13b1618c08ad713a2)
  Thanks [@saihaj](https://github.com/saihaj)! - append /api/v0 automatically to Graph IPFS endpoint

## 0.46.1

### Patch Changes

- [#1277](https://github.com/graphprotocol/graph-tooling/pull/1277)
  [`6d5378d`](https://github.com/graphprotocol/graph-tooling/commit/6d5378d08839a353559aad1c680b74aed0ce69e9)
  Thanks [@saihaj](https://github.com/saihaj)! - point to correct IPFS URL endpoint

## 0.46.0

### Minor Changes

- [#1275](https://github.com/graphprotocol/graph-tooling/pull/1275)
  [`0264c5d`](https://github.com/graphprotocol/graph-tooling/commit/0264c5da27ef3b01008f749f8ccbf19f1cfe4f7d)
  Thanks [@pranavdaa](https://github.com/pranavdaa)! - Adding sepolia testnet to the graph-cli

## 0.45.2

### Patch Changes

- [#1268](https://github.com/graphprotocol/graph-tooling/pull/1268)
  [`d473997`](https://github.com/graphprotocol/graph-tooling/commit/d473997a9fea02e91649a0e345fd84dbeff54fdf)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:
  - Updated dependency
    [`ipfs-http-client@55.0.0` ↗︎](https://www.npmjs.com/package/ipfs-http-client/v/55.0.0) (from
    `34.0.0`, in `dependencies`)
  - Updated dependency [`jayson@4.0.0` ↗︎](https://www.npmjs.com/package/jayson/v/4.0.0) (from
    `3.7.0`, in `dependencies`)

## 0.45.1

### Patch Changes

- [#1263](https://github.com/graphprotocol/graph-tooling/pull/1263)
  [`2ba2ba9`](https://github.com/graphprotocol/graph-tooling/commit/2ba2ba96c6cdc10461903b0712f122eb6d245f86)
  Thanks [@mihirgupta0900](https://github.com/mihirgupta0900)! - Fixes dependency error from
  `ipfs-http-client` and `concat-stream`. Visit
  https://github.com/graphprotocol/graph-tooling/issues/1262 for more details.

## 0.45.0

### Minor Changes

- [#1225](https://github.com/graphprotocol/graph-tooling/pull/1225)
  [`3f9aa1c`](https://github.com/graphprotocol/graph-tooling/commit/3f9aa1ce7dbb8c26da9fc8e3d9801ec412886f1d)
  Thanks [@saihaj](https://github.com/saihaj)! - When the contract has an `id` event, the CLI
  renames the `id` entity to `{contractName}_id` and map it to `{contractName}_id` in the mapping.

- [#1209](https://github.com/graphprotocol/graph-tooling/pull/1209)
  [`f26398e`](https://github.com/graphprotocol/graph-tooling/commit/f26398e054c556f414a1b45e92b7e4007a9b5a79)
  Thanks [@kalloc](https://github.com/kalloc)! - Support `ts` typing in tests folder

### Patch Changes

- [#1216](https://github.com/graphprotocol/graph-tooling/pull/1216)
  [`47e683d`](https://github.com/graphprotocol/graph-tooling/commit/47e683da9cd19b1eb6408c84111e1eadad84304d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`yaml@1.10.2` ↗︎](https://www.npmjs.com/package/yaml/v/1.10.2) (from
    `1.9.2`, in `dependencies`)

- [#1218](https://github.com/graphprotocol/graph-tooling/pull/1218)
  [`01046d9`](https://github.com/graphprotocol/graph-tooling/commit/01046d946f42f436fb10d54c5c959012cd6fef67)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Added dependency
    [`@whatwg-node/fetch@^0.8.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.4) (to
    `dependencies`)
  - Removed dependency [`node-fetch@2.6.0` ↗︎](https://www.npmjs.com/package/node-fetch/v/2.6.0)
    (from `dependencies`)

- [#1224](https://github.com/graphprotocol/graph-tooling/pull/1224)
  [`f82aac9`](https://github.com/graphprotocol/graph-tooling/commit/f82aac9e784c9ab6c2c9185cf1ea54ece0be1085)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`chokidar@3.5.3` ↗︎](https://www.npmjs.com/package/chokidar/v/3.5.3) (from
    `3.5.1`, in `dependencies`)

- [#1226](https://github.com/graphprotocol/graph-tooling/pull/1226)
  [`ae76840`](https://github.com/graphprotocol/graph-tooling/commit/ae76840703fa62260d161968abfc461290ecfd22)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`debug@4.3.4` ↗︎](https://www.npmjs.com/package/debug/v/4.3.4) (from
    `4.3.1`, in `dependencies`)

- [#1227](https://github.com/graphprotocol/graph-tooling/pull/1227)
  [`7516030`](https://github.com/graphprotocol/graph-tooling/commit/751603045fc5f92d0d4b950f3a0fa263f040c401)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency
    [`docker-compose@0.23.19` ↗︎](https://www.npmjs.com/package/docker-compose/v/0.23.19) (from
    `0.23.4`, in `dependencies`)

- [#1228](https://github.com/graphprotocol/graph-tooling/pull/1228)
  [`cefbf3a`](https://github.com/graphprotocol/graph-tooling/commit/cefbf3a0d4601d79c4700eed45f1fc3ede35fbd7)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`semver@7.3.8` ↗︎](https://www.npmjs.com/package/semver/v/7.3.8) (from
    `7.3.5`, in `dependencies`)

- [#1229](https://github.com/graphprotocol/graph-tooling/pull/1229)
  [`425558f`](https://github.com/graphprotocol/graph-tooling/commit/425558f3211ed79bbfc090d21e39a0eea7cb7cb5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`tmp-promise@3.0.3` ↗︎](https://www.npmjs.com/package/tmp-promise/v/3.0.3)
    (from `3.0.2`, in `dependencies`)

- [#1232](https://github.com/graphprotocol/graph-tooling/pull/1232)
  [`dc1e433`](https://github.com/graphprotocol/graph-tooling/commit/dc1e43304cf382d67bbd4f2f5d9f80e3fe676b47)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@oclif/core@2.8.0` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.8.0)
    (from `2.0.7`, in `dependencies`)

- [#1234](https://github.com/graphprotocol/graph-tooling/pull/1234)
  [`2f6838a`](https://github.com/graphprotocol/graph-tooling/commit/2f6838ac06e0d3b672565594a1acd817d46cb450)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`fs-extra@9.1.0` ↗︎](https://www.npmjs.com/package/fs-extra/v/9.1.0) (from
    `9.0.0`, in `dependencies`)

- [#1239](https://github.com/graphprotocol/graph-tooling/pull/1239)
  [`b331905`](https://github.com/graphprotocol/graph-tooling/commit/b331905790c193183fb9cad834f488027cb3fd91)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`jayson@3.7.0` ↗︎](https://www.npmjs.com/package/jayson/v/3.7.0) (from
    `3.6.6`, in `dependencies`)

- [#1240](https://github.com/graphprotocol/graph-tooling/pull/1240)
  [`ef99d62`](https://github.com/graphprotocol/graph-tooling/commit/ef99d6234de249a04e9d5f09d1f0909f9261d413)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`js-yaml@3.14.1` ↗︎](https://www.npmjs.com/package/js-yaml/v/3.14.1) (from
    `3.13.1`, in `dependencies`)

- [#1243](https://github.com/graphprotocol/graph-tooling/pull/1243)
  [`5682ab5`](https://github.com/graphprotocol/graph-tooling/commit/5682ab5aab38013aa68936d70458962f2927db75)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`yaml@1.10.2` ↗︎](https://www.npmjs.com/package/yaml/v/1.10.2) (from
    `1.9.2`, in `dependencies`)

- [#1248](https://github.com/graphprotocol/graph-tooling/pull/1248)
  [`1ecb75a`](https://github.com/graphprotocol/graph-tooling/commit/1ecb75a7e45b120841c799bcb599a1fde757313c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`glob@9.3.4` ↗︎](https://www.npmjs.com/package/glob/v/9.3.4) (from `7.1.6`,
    in `dependencies`)

- [#1246](https://github.com/graphprotocol/graph-tooling/pull/1246)
  [`8e1409f`](https://github.com/graphprotocol/graph-tooling/commit/8e1409fbd04fa9e34fbc7d49160d9888ef74aebb)
  Thanks [@dimitrovmaksim](https://github.com/dimitrovmaksim)! - Fixes `graph add` overwriting the
  event names in `subgraph.yaml` and the ABI file when existing contracts have events with the same
  name.

- [#1207](https://github.com/graphprotocol/graph-tooling/pull/1207)
  [`ad275b3`](https://github.com/graphprotocol/graph-tooling/commit/ad275b31e635dab03cfefda00617ef9f612b01c0)
  Thanks [@saihaj](https://github.com/saihaj)! - bring back short hand for version and help

## 0.44.0

### Minor Changes

- [#1210](https://github.com/graphprotocol/graph-tooling/pull/1210)
  [`17da832`](https://github.com/graphprotocol/graph-tooling/commit/17da8322d23e1632d57d27fa1c4c158e2858b967)
  Thanks [@pranavdaa](https://github.com/pranavdaa)! - Added polygon zkevm to cli

### Patch Changes

- [#1201](https://github.com/graphprotocol/graph-tooling/pull/1201)
  [`f87e54c`](https://github.com/graphprotocol/graph-tooling/commit/f87e54c1615ace99ffc04ad9dc4b21bdcbe381bc)
  Thanks [@saihaj](https://github.com/saihaj)! - read testsFolder from matchstick yaml and set the
  paths based on that

- [#1201](https://github.com/graphprotocol/graph-tooling/pull/1201)
  [`f87e54c`](https://github.com/graphprotocol/graph-tooling/commit/f87e54c1615ace99ffc04ad9dc4b21bdcbe381bc)
  Thanks [@saihaj](https://github.com/saihaj)! - make datasource and version optional args for test
  command

- [`876bc52`](https://github.com/graphprotocol/graph-tooling/commit/876bc523e5a53db162d9b5aa79e9de76a9e92ccf)
  Thanks [@saihaj](https://github.com/saihaj)! - Allow file data sources (with no network) to deploy
  to the studio. File data sources don't have a network specified.

- [#1197](https://github.com/graphprotocol/graph-tooling/pull/1197)
  [`b52e3b1`](https://github.com/graphprotocol/graph-tooling/commit/b52e3b1034cf3411a6c1c94aff73633b847256a0)
  Thanks [@saihaj](https://github.com/saihaj)! - make generated list children non-nullable

- [#1193](https://github.com/graphprotocol/graph-tooling/pull/1193)
  [`c240588`](https://github.com/graphprotocol/graph-tooling/commit/c2405887fbe3128d530fd76ffd0f97fe195d37f5)
  Thanks [@saihaj](https://github.com/saihaj)! - do not generate setters for derived fields

## 0.43.0

### Minor Changes

- [#1192](https://github.com/graphprotocol/graph-tooling/pull/1192)
  [`4a5d805`](https://github.com/graphprotocol/graph-tooling/commit/4a5d805d3a5c44899c4897d1a858b13c6c36673b)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add zksync era

## 0.42.4

### Patch Changes

- [#1185](https://github.com/graphprotocol/graph-tooling/pull/1185)
  [`edf14d6`](https://github.com/graphprotocol/graph-tooling/commit/edf14d6fa580e99b317a977d0b693f182e746d4e)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Fix graph init failing to add more than one
  contract

## 0.42.3

### Patch Changes

- [#1134](https://github.com/graphprotocol/graph-tooling/pull/1134)
  [`a156355`](https://github.com/graphprotocol/graph-tooling/commit/a156355351f51f242bc2fa005125ffebed62eebe)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Fix Prefix error when using graph init

- [#1138](https://github.com/graphprotocol/graph-tooling/pull/1138)
  [`eb6815e`](https://github.com/graphprotocol/graph-tooling/commit/eb6815eb4af7c8c4d9a9f2b252dca8e350c81d32)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Fix default value issues with abi and
  startBlock

## 0.42.2

### Patch Changes

- [#1132](https://github.com/graphprotocol/graph-tooling/pull/1132)
  [`719c8f5`](https://github.com/graphprotocol/graph-tooling/commit/719c8f5e890cc2392fb15cdb318b8f55570f9419)
  Thanks [@cmwhited](https://github.com/cmwhited)! - enable deployment of celo, avalanche and
  arbitrum-one in studio

## 0.42.1

### Patch Changes

- [#1129](https://github.com/graphprotocol/graph-tooling/pull/1129)
  [`8e04027`](https://github.com/graphprotocol/graph-tooling/commit/8e04027ea1da22d7de22edf08d741192999b0146)
  Thanks [@YaroShkvorets](https://github.com/YaroShkvorets)! - Fix availableNetworks() for
  substreams

## 0.42.0

### Minor Changes

- [#1128](https://github.com/graphprotocol/graph-tooling/pull/1128)
  [`2ebd032`](https://github.com/graphprotocol/graph-tooling/commit/2ebd0326cab00efc9abad7ad4287cee20a8cfea2)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add base scan URL

- [#1068](https://github.com/graphprotocol/graph-tooling/pull/1068)
  [`1e3195d`](https://github.com/graphprotocol/graph-tooling/commit/1e3195d365bd445f8bd6ba3f1c3b66be20510b94)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add startblock auto fetch for `add` command

- [#1079](https://github.com/graphprotocol/graph-tooling/pull/1079)
  [`570eb22`](https://github.com/graphprotocol/graph-tooling/commit/570eb225fad705998cca3998879a6a1140a73143)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Remove optimism-kovan, Add optimism-goerli

- [#1126](https://github.com/graphprotocol/graph-tooling/pull/1126)
  [`6d20494`](https://github.com/graphprotocol/graph-tooling/commit/6d204944e41079dd2ddd228a3b4f0e1a07124913)
  Thanks [@azf20](https://github.com/azf20)! - Add `mainnet` as network for substreams

### Patch Changes

- [#1127](https://github.com/graphprotocol/graph-tooling/pull/1127)
  [`b8d2297`](https://github.com/graphprotocol/graph-tooling/commit/b8d2297bea994b852d5a61b557e4eccda283ec75)
  Thanks [@saihaj](https://github.com/saihaj)! - Prioirtize node flag. If provided we do not need to
  go lookup what product to deploy to

## 0.41.1

### Patch Changes

- [#1077](https://github.com/graphprotocol/graph-tooling/pull/1077)
  [`7efc38b`](https://github.com/graphprotocol/graph-tooling/commit/7efc38ba68dad1e7b09934f9b6b4e5566c298bc1)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Ask for product if missing when using deploy
  command

## 0.41.0

### Minor Changes

- [#1076](https://github.com/graphprotocol/graph-tooling/pull/1076)
  [`c18a663`](https://github.com/graphprotocol/graph-tooling/commit/c18a66349e18c21636d83a19388df1580848aa64)
  Thanks [@saihaj](https://github.com/saihaj)! - add `base-testnet` to studio

- [#1055](https://github.com/graphprotocol/graph-tooling/pull/1055)
  [`044cd92`](https://github.com/graphprotocol/graph-tooling/commit/044cd92d0ceb9628c7f7fbe3627a09b867710247)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Migrate to Oclif

### Patch Changes

- [#1055](https://github.com/graphprotocol/graph-tooling/pull/1055)
  [`044cd92`](https://github.com/graphprotocol/graph-tooling/commit/044cd92d0ceb9628c7f7fbe3627a09b867710247)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Added dependency [`@oclif/core@2.0.7` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.0.7)
    (to `dependencies`)

- [#1074](https://github.com/graphprotocol/graph-tooling/pull/1074)
  [`e84d1e8`](https://github.com/graphprotocol/graph-tooling/commit/e84d1e873d9b2a8967c5fe2a85fce48b2caeb75f)
  Thanks [@saihaj](https://github.com/saihaj)! - update GH issues link for error message

- [#1071](https://github.com/graphprotocol/graph-tooling/pull/1071)
  [`17d0888`](https://github.com/graphprotocol/graph-tooling/commit/17d08884fbc30a78089403e13139622b4145e9ff)
  Thanks [@saihaj](https://github.com/saihaj)! - global files are not needed when using substreams

## 0.40.0

### Minor Changes

- [#1064](https://github.com/graphprotocol/graph-tooling/pull/1064)
  [`aaecb6e`](https://github.com/graphprotocol/graph-tooling/commit/aaecb6e31c15b7191797bf61c9d496a6d20a3248)
  Thanks [@saihaj](https://github.com/saihaj)! - enable deploymnets of testnets in studio

## 0.39.0

### Minor Changes

- [#1059](https://github.com/graphprotocol/graph-tooling/pull/1059)
  [`7ffaf0c`](https://github.com/graphprotocol/graph-tooling/commit/7ffaf0ce9532011ae458abff4cf425328aa5c40f)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Auto fetch startBlock

### Patch Changes

- [#968](https://github.com/graphprotocol/graph-tooling/pull/968)
  [`bf4f541`](https://github.com/graphprotocol/graph-tooling/commit/bf4f5417beca4714792321b271d25fe754350fa3)
  Thanks [@kosecki123](https://github.com/kosecki123)! - fix cleoscan explorer URLs

## 0.38.0

### Minor Changes

- [#1049](https://github.com/graphprotocol/graph-tooling/pull/1049)
  [`18cf83f`](https://github.com/graphprotocol/graph-tooling/commit/18cf83fe1ec703fdc74fa03f898e2ca8b7e5f1fd)
  Thanks [@incrypto32](https://github.com/incrypto32)! - Add startBlock prompt

- [#1053](https://github.com/graphprotocol/graph-tooling/pull/1053)
  [`bc82507`](https://github.com/graphprotocol/graph-tooling/commit/bc8250763799ae2871c5d5b67c279c673329bcbc)
  Thanks [@saihaj](https://github.com/saihaj)! - Remove arbitrum-rinkeby to add arbitrum-goerli

## 0.37.7

### Patch Changes

- [#1044](https://github.com/graphprotocol/graph-tooling/pull/1044)
  [`8367f90`](https://github.com/graphprotocol/graph-tooling/commit/8367f90167172181870c1a7fe5b3e84d2c5aeb2c)
  Thanks [@saihaj](https://github.com/saihaj)! - publish readme with packages

## 0.37.6

### Patch Changes

- [#1039](https://github.com/graphprotocol/graph-cli/pull/1039)
  [`accefb6`](https://github.com/graphprotocol/graph-cli/commit/accefb637bf1c1db64f63b32a18c291574aa4974)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:

  - Removed dependency [`pkginfo@0.4.1` ↗︎](https://www.npmjs.com/package/pkginfo/v/0.4.1) (from
    `dependencies`)

- [#1040](https://github.com/graphprotocol/graph-cli/pull/1040)
  [`5fd1e9c`](https://github.com/graphprotocol/graph-cli/commit/5fd1e9c00c85db4b0c65e37ba0c0b09ea034bb96)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Target Node 14 and specify engine in
  package.json

- [#1039](https://github.com/graphprotocol/graph-cli/pull/1039)
  [`accefb6`](https://github.com/graphprotocol/graph-cli/commit/accefb637bf1c1db64f63b32a18c291574aa4974)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Use package.json to get package version

## 0.37.5

### Patch Changes

- [#1035](https://github.com/graphprotocol/graph-cli/pull/1035)
  [`d6fee92`](https://github.com/graphprotocol/graph-cli/commit/d6fee92d6de9b0addf9e24fd33e8820979f9f310)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Build before release

## 0.37.4

### Patch Changes

- [#1033](https://github.com/graphprotocol/graph-cli/pull/1033)
  [`ac2cf09`](https://github.com/graphprotocol/graph-cli/commit/ac2cf094b0f19b7778cab888c2e9b324b6544073)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Include dist folder in packaged files

## 0.37.3

### Patch Changes

- [#1020](https://github.com/graphprotocol/graph-cli/pull/1020)
  [`4c5e452`](https://github.com/graphprotocol/graph-cli/commit/4c5e452cbc2eceb75db29019fb3b4c769c9618f4)
  Thanks [@saihaj](https://github.com/saihaj)! - dependencies updates:

  - Updated dependency [`immutable@4.2.1` ↗︎](https://www.npmjs.com/package/immutable/v/4.2.1)
    (from `3.8.2`, in `dependencies`)

- [`d42f199`](https://github.com/graphprotocol/graph-cli/commit/d42f199502df7bac79e8cafc667d5c712f5a3599)
  Thanks [@darienmh](https://github.com/darienmh)! - fix `chapel` network etherscan URL

## 0.37.2

### Patch Changes

- [#1023](https://github.com/graphprotocol/graph-cli/pull/1023)
  [`bf5ab6d`](https://github.com/graphprotocol/graph-cli/commit/bf5ab6dc0f19fcb5b8e599b7d9b1c2b6efcbe005)
  Thanks [@evaporei](https://github.com/evaporei)! - update graph-ts to 0.29.1

## 0.37.1

### Patch Changes

- [#1015](https://github.com/graphprotocol/graph-cli/pull/1015)
  [`5df304c`](https://github.com/graphprotocol/graph-cli/commit/5df304c75ecc339f681eeae858325a7859183dda)
  Thanks [@saihaj](https://github.com/saihaj)! - fix fantom network init URLs
