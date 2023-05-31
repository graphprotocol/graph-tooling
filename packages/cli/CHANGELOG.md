# @graphprotocol/graph-cli

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
  Thanks [@cmwhited](https://github.com/cmwhited)! - enable deployment of celo, avalance and
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

  - Added dependency [`@oclif/core@2.0.7` ↗︎](https://www.npmjs.com/package/@oclif/core/v/2.0.7) (to
    `dependencies`)

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

  - Updated dependency [`immutable@4.2.1` ↗︎](https://www.npmjs.com/package/immutable/v/4.2.1) (from
    `3.8.2`, in `dependencies`)

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
