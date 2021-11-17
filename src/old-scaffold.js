const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const pkginfo = require('pkginfo')(module)

const { getSubgraphBasename } = require('./command-helpers/subgraph')
const { step } = require('./command-helpers/spinner')
// TODO: Use Protocol class to getABI
const ABI = require('./protocols/ethereum/abi')
const AbiCodeGenerator = require('./protocols/ethereum/codegen/abi')
const Scaffold = require('./scaffold')

const graphCliVersion = process.env.GRAPH_CLI_TESTS
  // JSON.stringify should remove this key, we will install the local
  // graph-cli for the tests using `npm link` instead of fetching from npm.
  ? undefined
  // For scaffolding real subgraphs
  : `${module.exports.version}`

// package.json

const generatePackageJson = ({ subgraphName, node }) =>
  prettier.format(
    JSON.stringify({
      name: getSubgraphBasename(subgraphName),
      license: 'UNLICENSED',
      scripts: {
        codegen: 'graph codegen',
        build: 'graph build',
        deploy:
          `graph deploy ` +
          `--node ${node} ` +
          subgraphName,
        'create-local': `graph create --node http://localhost:8020/ ${subgraphName}`,
        'remove-local': `graph remove --node http://localhost:8020/ ${subgraphName}`,
        'deploy-local':
          `graph deploy ` +
          `--node http://localhost:8020/ ` +
          `--ipfs http://localhost:5001 ` +
          subgraphName,
      },
      dependencies: {
        '@graphprotocol/graph-cli': graphCliVersion,
        '@graphprotocol/graph-ts': `0.24.1`,
      },
    }),
    { parser: 'json' },
  )

const tsConfig = prettier.format(
  JSON.stringify({
    extends: '@graphprotocol/graph-ts/types/tsconfig.base.json',
    include: ['src'],
  }),
  { parser: 'json' },
)

const generateScaffold = async (
  {
    protocolInstance,
    abi,
    contract,
    network,
    subgraphName,
    indexEvents,
    contractName = 'Contract',
    node,
  },
  spinner,
) => {
  step(spinner, 'Generate subgraph')

  let packageJson = generatePackageJson({ subgraphName, node })

  let scaffold = new Scaffold({
    protocol: protocolInstance,
    abi,
    indexEvents,
    contract,
    network,
    contractName,
    subgraphName,
  })

  let manifest = scaffold.generateManifest()
  let schema = scaffold.generateSchema()
  let mapping = scaffold.generateMapping()

  return {
    'package.json': packageJson,
    'subgraph.yaml': manifest,
    'schema.graphql': schema,
    'tsconfig.json': tsConfig,
    src: { 'mapping.ts': mapping },
    abis: {
      [`${contractName}.json`]: prettier.format(JSON.stringify(abi.data), {
        parser: 'json',
      }),
    },
  }
}

const writeScaffoldDirectory = async (scaffold, directory, spinner) => {
  // Create directory itself
  await fs.mkdirs(directory)

  let promises = Object.keys(scaffold).map(async basename => {
    let content = scaffold[basename]
    let filename = path.join(directory, basename)

    // Write file or recurse into subdirectory
    if (typeof content === 'string') {
      await fs.writeFile(filename, content, { encoding: 'utf-8' })
    } else {
      writeScaffoldDirectory(content, path.join(directory, basename), spinner)
    }
  })

  await Promise.all(promises)
}

const writeScaffold = async (scaffold, directory, spinner) => {
  step(spinner, `Write subgraph to directory`)
  await writeScaffoldDirectory(scaffold, directory, spinner)
}

module.exports = {
  ...module.exports,
  generateScaffold,
  writeScaffold,
}
