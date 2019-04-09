const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const pkginfo = require('pkginfo')(module)

const { getSubgraphBasename } = require('./command-helpers/subgraph')
const { step } = require('./command-helpers/spinner')
const { ascTypeForEthereum, valueTypeForAsc } = require('./codegen/types')

const abiEvents = abi => abi.filter(item => item.type === 'event')

// package.json

const generatePackageJson = ({ subgraphName }) =>
  prettier.format(
    JSON.stringify({
      name: getSubgraphBasename(subgraphName),
      license: 'UNLICENSED',
      scripts: {
        codegen: 'graph codegen',
        build: 'graph build',
        deploy:
          `graph deploy ` +
          `--node https://api.thegraph.com/deploy/ ` +
          `--ipfs https://api.thegraph.com/ipfs/ ` +
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
        '@graphprotocol/graph-cli': `${module.exports.version}`,
        '@graphprotocol/graph-ts': '0.6.0',
      },
    }),
    { parser: 'json' }
  )

// Subgraph manifest

const eventSignature = event =>
  `${event.name}(${event.inputs.map(input => input.type).join(',')})`

const generateManifest = ({ abi, address, network, subgraphName }) =>
  prettier.format(
    `
specVersion: 0.0.1
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: Contract
    network: ${network}
    source:
      address: '${address}'
      abi: Contract
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.1
      language: wasm/assemblyscript
      entities:
        ${abiEvents(abi)
          .map(event => `- ${event.name}`)
          .join('\n        ')}
      abis:
        - name: Contract
          file: ./abis/Contract.json
      eventHandlers:
        ${abiEvents(abi)
          .map(
            event => `
        - event: ${eventSignature(event)}
          handler: handle${event.name}`
          )
          .join('')}
      file: ./src/mapping.ts
`,
    { parser: 'yaml' }
  )

// Schema

const ethereumTypeToGraphQL = name => {
  let ascType = ascTypeForEthereum(name)
  return valueTypeForAsc(ascType)
}

const generateEventType = event => `type ${event.name} @entity {
      id: ID!
      ${event.inputs
        .map(
          (input, index) =>
            `${input.name || `param${index}`}: ${ethereumTypeToGraphQL(input.type)}! # ${
              input.type
            }`
        )
        .join('\n')}
    }`

const generateSchema = ({ abi }) =>
  prettier.format(
    abiEvents(abi)
      .map(generateEventType)
      .join('\n'),
    {
      parser: 'graphql',
    }
  )

// Mapping

const generateMapping = ({ abi, subgraphName }) =>
  prettier.format(
    `
  import { ${abiEvents(abi).map(
    event => `${event.name} as ${event.name}Event`
  )}} from '../generated/Contract/Contract'
  import { ${abiEvents(abi).map(event => event.name)} } from '../generated/schema'
  
  ${abiEvents(abi)
    .map(
      event =>
        `
  export function handle${event.name}(event: ${event.name}Event): void {
    let entity = new ${
      event.name
    }(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    ${event.inputs
      .map(
        (input, index) =>
          `entity.${input.name || `param${index}`} = event.params.${input.name ||
            `param${index}`}`
      )
      .join('\n')}
    entity.save()
  }
    `
    )
    .join('\n')}
  `,
    { parser: 'typescript', semi: false }
  )

const generateScaffold = async ({ abi, address, network, subgraphName }, spinner) => {
  step(spinner, 'Generate subgraph from ABI')
  let packageJson = generatePackageJson({ subgraphName })
  let manifest = generateManifest({ abi, address, network, subgraphName })
  let schema = generateSchema({ abi })
  let mapping = generateMapping({ abi, subgraphName })

  return {
    'package.json': packageJson,
    'subgraph.yaml': manifest,
    'schema.graphql': schema,
    src: { 'mapping.ts': mapping },
    abis: {
      'Contract.json': prettier.format(JSON.stringify(abi), {
        parser: 'json',
      }),
    },
  }
}

const writeScaffoldDirectory = async (scaffold, directory, spinner) => {
  // Create directory itself
  fs.mkdirsSync(directory)

  Object.keys(scaffold).forEach(basename => {
    let content = scaffold[basename]
    let filename = path.join(directory, basename)

    // Write file or recurse into subdirectory
    if (typeof content === 'string') {
      fs.writeFileSync(filename, content, { encoding: 'utf-8' })
    } else {
      writeScaffoldDirectory(content, path.join(directory, basename), spinner)
    }
  })
}

const writeScaffold = async (scaffold, directory, spinner) => {
  step(spinner, `Write subgraph to directory`)
  await writeScaffoldDirectory(scaffold, directory, spinner)
}

module.exports = {
  ...module.exports,
  abiEvents,
  generateScaffold,
  writeScaffold,
}
