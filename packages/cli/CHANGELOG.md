# @graphprotocol/graph-cli

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
