const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const fetch = require('node-fetch')
const pkginfo = require('pkginfo')(module)

const { getSubgraphBasename } = require('./command-helpers/subgraph')
const { step } = require('./command-helpers/spinner')
const { ascTypeForEthereum, valueTypeForAsc } = require('./codegen/types')
const ABI = require('./abi')
const AbiCodeGenerator = require('./codegen/abi')
const util = require('./codegen/util')

const abiEvents = abi =>
  util.disambiguateNames({
    values: abi.data.filter(item => item.get('type') === 'event'),
    getName: event => event.get('name'),
    setName: (event, name) => event.set('_alias', name.replace(/[^a-zA-Z0-9]/g, '')),
  })

  const abiMethods = abi =>   
  util.disambiguateNames({
    values: abi.data.filter(item => item.get('type') === 'function' && item.get('stateMutability') !== 'view'  && item.get('stateMutability') !== 'pure'),
    getName: method => method.get('name'),
    setName: (method, name) => method.set('_alias', name.replace(/[^a-zA-Z0-9]/g, '')),
  })

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
        '@graphprotocol/graph-ts': `0.18.0`,
      },
    }),
    { parser: 'json' },
  )


  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } 
// Subgraph manifest

const getStartBlock = async(address, network, etherscanApikey) => {

  if(network == 'poa-core'){
    return 0;
  }

  const url = `https://${
    network === 'mainnet' ? 'api' : `api-${network}`
  }.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc${etherscanApikey?'&apikey='+etherscanApikey:''}`;
  
  let result = await fetch(url)
  let json = await result.json()
  let blockNumber = 0
  // Etherscan returns a JSON object that has a `status`, a `message` and
  // a `result` field. The `status` is '0' in case of errors and '1' in
  // case of success
  if (json.status === '1') {
    blockNumber = json.result.length>0? json.result[0].blockNumber:0;
    
  } 
  console.log(`Start block number for contract ${address} is ${blockNumber}`);
  await sleep(1000);
  return blockNumber;
}

const entityNameByEvent = (eventName, contractName) => `${contractName}${eventName}Event`;
const entityNameByMethod = (methodName, contractName) => `${contractName}${methodName}Call` ;


const generateDataSource = async({ abis, addresses, network, contractNames, etherscanApikey }) => {


    const result = [];
    for(let i =0; i< abis.length; i++) {
      const abi = abis[i];
      const r = ` 
  - kind: ethereum/contract
    name: ${contractNames[i]}
    network: ${network}
    source:
      address: '${addresses[i]}'
      abi: ${contractNames[i]}
      startBlock: ${await getStartBlock(addresses[i], network, etherscanApikey)}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.2
      language: wasm/assemblyscript
      entities:
        ${abiEvents(abi)
          .map(event => `- ${entityNameByEvent(event.get('_alias'),contractNames[i])}`)
          .join('\n        ')}
        ${abiMethods(abi)
          .map(method => `- ${entityNameByMethod(method.get('_alias'), contractNames[i])}`)
          .join('\n        ')}
      abis:
        - name: ${contractNames[i]}
          file: ./abis/${contractNames[i]}.json
      callHandlers:
        ${abiMethods(abi)
          .map(
            method => `
        - function: ${ABI.eventSignature(method)}
          handler: handle${method.get('_alias')}Call`,
          )
          .join('')}    
      eventHandlers:
        ${abiEvents(abi)
          .map(
            event => `
        - event: ${ABI.eventSignature(event)}
          handler: handle${event.get('_alias')}Event`,
          )
          .join('')}
      file: ./src/${contractNames[i]}Mapping.ts`
      result.push(r);
    }

    return result.join('');

}
const generateManifest = async ({ abis, addresses, network, contractNames, etherscanApikey }) =>
  prettier.format(
    `
specVersion: 0.0.1
schema:
  file: ./schema.graphql
dataSources:
  ${await generateDataSource({ abis, addresses, network, contractNames, etherscanApikey })}
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

const generateEventFields = ({ index, input, context = 'event' }) =>
  input.type == 'tuple'
    ? util
        .unrollTuple({ value: input, path: [input.name || `param${index}`], index })
        .map(({ path, type }) => generateField({ name: path.join('_'), type }))
    : [generateField({ name: input.name || (context == 'event' ? `param${index}`: `value${index}`), type: input.type })]

const generateEventType = (event, contractName) => `type ${entityNameByEvent(event._alias, contractName)} @entity {
      id: ID!
      timestamp: BigInt! # uint256
      ${event.inputs
        .reduce(
          (acc, input, index) => acc.concat(generateEventFields({ input, index })),
          [],
        )
        .join('\n')}
    }`

    const generateMethodType = (method, contractName) => `type ${entityNameByMethod(method._alias, contractName)} @entity {
      id: ID!
      timestamp: BigInt! # uint256
      ${method.inputs
        .reduce(
          (acc, input, index) => acc.concat(generateEventFields({ input, index })),
          [],
        )
        .join('\n')}
        ${method.outputs
          .reduce(
            (acc, input, index) => acc.concat(generateEventFields({ input, index, context: 'method' })),
            [],
          )
          .join('\n')}
    }`


const generateSchema = ({ abis, indexEvents, contractNames }) => {

return abis.map((abi, index) => {
  let events = abiEvents(abi).toJS()
  let methods = abiMethods(abi).toJS();
  let contractName = contractNames[index];
  
  const eventSchema = [...events].map(e => generateEventType(e, contractName)).join('\n\n');
  const methodSchema = methods.map(m => generateMethodType(m, contractName)).join('\n\n');
  return prettier.format(
    [eventSchema, methodSchema].join('\n\n'),
    {
      parser: 'graphql',
    },
  )
 }).join('\n')
}

// Mapping

const generateTupleFieldAssignments = ({ keyPath, index, component, context = 'event', field ='params' }) => {
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
    : [`entity.${flatName} = ${context}.${field}.${nestedName}`]
}

const generateFieldAssignment = (path, context = 'event', field = 'params') =>
  `entity.${path.join('_')} = ${context}.${field}.${path.join('.')}`

const generateFieldAssignments = ({ index, input, context = 'event', field = 'params' }) =>
  input.type === 'tuple'
    ? util
        .unrollTuple({ value: input, index, path: [input.name || (context === 'event' ? `param${index}` : `value${index}`)] })
        .map(({ path }) => generateFieldAssignment(path,context, field))
    : generateFieldAssignment([input.name || (context === 'event' ? `param${index}` : `value${index}`)], context, field)

const generateEventFieldAssignments = event =>
  event.inputs.reduce(
    (acc, input, index) => acc.concat(generateFieldAssignments({ input, index })),
    [],
  )

  const generateMethodFieldAssignments = method => {
   let output = [];
    output = method.inputs.reduce(
      (acc, input, index) => acc.concat(generateFieldAssignments({ input, index, context:'call', field: 'inputs' })),
      output,
    );

    output = method.outputs.reduce(
      (acc, input, index) => acc.concat(generateFieldAssignments({ input, index, context:'call', field: 'outputs'})),
      output,
    );

    return output;
  }

const toTitleCase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const generateEventIndexingHandlers = (events, methods ,contractName) =>
  `
  import { ${events.map(
    event => `${event._alias} as ${event._alias}Event`,
  )}} from '../generated/${contractName}/${contractName}'
  import { ${methods.map(
    method => `${toTitleCase(method.name)}Call as ${toTitleCase(method._alias)}Call`,
  )}} from '../generated/${contractName}/${contractName}'
  import { ${events.map(event => entityNameByEvent(event._alias, contractName))} } from '../generated/schema'
  import { ${methods.map(method => entityNameByMethod(method._alias, contractName))} } from '../generated/schema'

  ${events
    .map(
      event =>
        `
  export function handle${event._alias}Event(event: ${event._alias}Event): void {
    let entity = new ${
      entityNameByEvent(event._alias, contractName)
    }(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
    ${generateEventFieldAssignments(event).join('\n')}
    entity.timestamp = event.block.timestamp
    entity.save()
  }
    `,
    )
    .join('\n')}


  ${methods
    .map(
      method =>
        `
  export function handle${method._alias}Call(call: ${toTitleCase(method._alias)}Call): void {
    let id = call.transaction.hash.toHex()
    let entity = new ${entityNameByMethod(method._alias, contractName)}(id);
    ${generateMethodFieldAssignments(method).join('\n')}
    entity.timestamp = call.block.timestamp
    entity.save()
  }
    `,
    )
    .join('\n')}
`

const generatePlaceholderHandlers = ({ abi, events, contractName }) =>
  `
  import { BigInt } from '@graphprotocol/graph-ts'
  import { ${contractName}, ${events.map(event => event._alias)} }
    from '../generated/${contractName}/${contractName}'
  import { ExampleEntity } from '../generated/schema'

  ${events
    .map((event, index) =>
      index === 0
        ? `
    export function handle${event._alias}(event: ${event._alias}): void {
      // Entities can be loaded from the store using a string ID; this ID
      // needs to be unique across all entities of the same type
      let entity = ExampleEntity.load(event.transaction.from.toHex())

      // Entities only exist after they have been saved to the store;
      // \`null\` checks allow to create entities on demand
      if (entity == null) {
        entity = new ExampleEntity(event.transaction.from.toHex())

        // Entity fields can be set using simple assignments
        entity.count = BigInt.fromI32(0)
      }

      // BigInt and BigDecimal math are supported
      entity.count = entity.count + BigInt.fromI32(1)

      // Entity fields can be set based on event parameters
      ${generateEventFieldAssignments(event)
        .slice(0, 2)
        .join('\n')}

      // Entities can be written to the store with \`.save()\`
      entity.save()

      // Note: If a handler doesn't require existing field values, it is faster
      // _not_ to load the entity from the store. Instead, create it fresh with
      // \`new Entity(...)\`, set the fields that should be updated and save the
      // entity back to the store. Fields that were not set or unset remain
      // unchanged, allowing for partial updates to be applied.

      // It is also possible to access smart contracts from mappings. For
      // example, the contract that has emitted the event can be connected to
      // with:
      //
      // let contract = Contract.bind(event.address)
      //
      // The following functions can then be called on this contract to access
      // state variables and other data:
      //
      // ${
        abi
          .codeGenerator()
          .callableFunctions()
          .isEmpty()
          ? 'None'
          : abi
              .codeGenerator()
              .callableFunctions()
              .map(fn => `- contract.${fn.get('name')}(...)`)
              .join('\n// ')
      }
    }
    `
        : `
export function handle${event._alias}(event: ${event._alias}): void {}
`,
    )
    .join('\n')}`

const generateMapping = ({ abi, indexEvents, contractName }) => {
  let events = abiEvents(abi).toJS()
  let methods = abiMethods(abi).toJS()
  return prettier.format(
    generateEventIndexingHandlers(events,methods , contractName),
    { parser: 'typescript', semi: false },
  )
}

const generateScaffold = async (
  { abis, addresses, network, subgraphName, indexEvents, contractNames, etherscanApikey },
  spinner,
) => {
  step(spinner, 'Generate subgraph from ABI')
  let packageJson = generatePackageJson({ subgraphName })
  let manifest = await generateManifest({ abis, addresses, network, contractNames, etherscanApikey })
  let schema = generateSchema({ abis, indexEvents, contractNames })

  const mappingMap = {};
  const abiMap = {};

  for(let i=0; i< abis.length; i++) {
    mappingMap[`${contractNames[i]}Mapping.ts`] = generateMapping({
       abi:abis[i], 
       subgraphName, 
       indexEvents, 
       contractName: contractNames[i],
       });
    abiMap[`${contractNames[i]}.json`] = prettier.format(JSON.stringify(abis[i].data), {
      parser: 'json',
    });
  }

  return {
    'package.json': packageJson,
    'subgraph.yaml': manifest,
    'schema.graphql': schema,
    src: mappingMap,
    abis: abiMap,
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
