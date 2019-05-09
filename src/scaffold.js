const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const pkginfo = require('pkginfo')(module)

const { getSubgraphBasename } = require('./command-helpers/subgraph')
const { step } = require('./command-helpers/spinner')
const { ascTypeForEthereum, valueTypeForAsc } = require('./codegen/types')
const ABI = require('./abi')
const util = require('./codegen/util')

const abiEvents = abi => {
  abi = ABI.normalized(abi)
  if (abi === null || abi === undefined) {
    throw new Error('Invalid ABI')
  }
  return util.disambiguateNames({
    values: abi.filter(item => item.type === 'event'),
    getName: event => event.name,
    setName: (event, name) => {
      event._alias = name
      return event
    },
  })
}

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
        '@graphprotocol/graph-ts': `0.11.0`,
      },
    }),
    { parser: 'json' },
  )

// Subgraph manifest

const eventSignature = event => {
  return `${event.name}(${event.inputs.map(input => input.type).join(',')})`
}

const generateManifest = ({ abi, address, network }) =>
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
      apiVersion: 0.0.2
      language: wasm/assemblyscript
      entities:
        ${abiEvents(abi)
          .map(event => `- ${event._alias}`)
          .join('\n        ')}
      abis:
        - name: Contract
          file: ./abis/Contract.json
      eventHandlers:
        ${abiEvents(abi)
          .map(
            event => `
        - event: ${eventSignature(event)}
          handler: handle${event._alias}`,
          )
          .join('')}
      file: ./src/mapping.ts
`,
    { parser: 'yaml' },
  )

// Schema

const ethereumTypeToGraphQL = name => {
  let ascType = ascTypeForEthereum(name)
  return valueTypeForAsc(ascType)
}

const generateField = ({ name, type }) =>
  `${name}: ${ethereumTypeToGraphQL(type)}! # ${type}`

const generateEventFields = ({ index, input }) =>
  input.type == 'tuple'
    ? util
        .unrollTuple({ value: input, path: [input.name || `param${index}`], index })
        .map(({ path, type }) => generateField({ name: path.join('_'), type }))
    : [generateField({ name: input.name || `param${index}`, type: input.type })]

const generateEventType = event => `type ${event._alias} @entity {
      id: ID!
      ${event.inputs
        .reduce(
          (acc, input, index) => acc.concat(generateEventFields({ input, index })),
          [],
        )
        .join('\n')}
    }`

const generateSchema = ({ abi }) =>
  prettier.format(
    abiEvents(abi)
      .map(generateEventType)
      .join('\n\n'),
    {
      parser: 'graphql',
    },
  )

// Mapping

const generateTupleFieldAssignments = ({ keyPath, index, component }) => {
  let name = component.name || `value${index}`
  keyPath = [...keyPath, name]

  let flatName = keyPath.join('_')
  let nestedName = keyPath.join('.')

  return component.type === 'tuple'
    ? component.components.reduce(
        (acc, subComponent, subIndex) =>
          acc.concat(
            generateTupleFieldAssignments({
              keyPath,
              index: subIndex,
              component: subComponent,
            }),
          ),
        [],
      )
    : [`entity.${flatName} = event.params.${nestedName}`]
}

const generateFieldAssignment = path =>
  `entity.${path.join('_')} = event.params.${path.join('.')}`

const generateFieldAssignments = ({ index, input }) =>
  input.type === 'tuple'
    ? util
        .unrollTuple({ value: input, index, path: [input.name || `param${index}`] })
        .map(({ path }) => generateFieldAssignment(path))
    : generateFieldAssignment([input.name || `param${index}`])

const generateEventFieldAssignments = event =>
  event.inputs.reduce(
    (acc, input, index) => acc.concat(generateFieldAssignments({ input, index })),
    [],
  )

const generateMapping = ({ abi }) =>
  prettier.format(
    `
  import { ${abiEvents(abi).map(
    event => `${event._alias} as ${event._alias}Event`,
  )}} from '../generated/Contract/Contract'
  import { ${abiEvents(abi).map(event => event._alias)} } from '../generated/schema'
  
  ${abiEvents(abi)
    .map(
      event =>
        `
  export function handle${event._alias}(event: ${event._alias}Event): void {
    let entity = new ${
      event._alias
    }(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    ${generateEventFieldAssignments(event).join('\n')}
    entity.save()
  }
    `,
    )
    .join('\n')}
  `,
    { parser: 'typescript', semi: false },
  )

const generateScaffold = async ({ abi, address, network, subgraphName }, spinner) => {
  step(spinner, 'Generate subgraph from ABI')
  let packageJson = generatePackageJson({ subgraphName })
  let manifest = generateManifest({ abi, address, network })
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
  generateEventFieldAssignments,
  generateManifest,
  generateMapping,
  generateScaffold,
  generateSchema,
  writeScaffold,
}
