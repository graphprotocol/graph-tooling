const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const yaml = require('yaml')

const { step } = require('./spinner')
const Scaffold = require('../scaffold')
const { generateEventIndexingHandlers } = require('../scaffold/mapping')
const { generateEventType, abiEvents } = require('../scaffold/schema')
const { ascTypeForEthereum, ethereumFromAsc } = require("../codegen/types")
const { strings } = require('gluegun')
const { Map } = require('immutable')

const generateDataSource = async (protocol, contractName, network, contractAddress, abi) => {
  const protocolManifest = protocol.getManifestScaffold()

  return Map.of(
    'kind', protocol.name,
    'name', contractName,
    'network', network,
    'source', yaml.parse(prettier.format(protocolManifest.source({contract: contractAddress, contractName}),
      {parser: 'yaml'})),
    'mapping', yaml.parse(prettier.format(protocolManifest.mapping({abi, contractName}),
      {parser: 'yaml'}))
  ).asMutable()
}

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

  const scaffold = new Scaffold({
    protocol: protocolInstance,
    abi,
    indexEvents,
    contract,
    network,
    contractName,
    subgraphName,
    node,
  })

  return scaffold.generate()
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
    } else if (content == null) {
      return // continue loop
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

const writeABI = async (abi, contractName) => {
  let data = prettier.format(JSON.stringify(abi.data), {
    parser: 'json',
  })

  await fs.writeFile(`./abis/${contractName}.json`, data, { encoding: 'utf-8' })
}

const writeSchema = async (abi, protocol, schemaPath, entities) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi).filter(event => entities.indexOf(event.get('name')) === -1).toJS()
    : []

  let data = prettier.format(
    events.map(
        event => generateEventType(event, protocol.name)
      ).join('\n\n'),
    {
      parser: 'graphql',
    },
  )

  await fs.appendFile(schemaPath, data, { encoding: 'utf-8' })
}

const writeMapping = async (abi, protocol, contractName, entities) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi).filter(event => entities.indexOf(event.get('name')) === -1).toJS()
    : []

  let mapping = prettier.format(
    generateEventIndexingHandlers(
        events,
        contractName,
      ),
    { parser: 'typescript', semi: false },
  )

  await fs.writeFile(`./src/${strings.kebabCase(contractName)}.ts`, mapping, { encoding: 'utf-8' })
}

const writeTestsHelper = async (abi, contractName, directory = "./") => {
  let utilsFile = prettier.format(
    generateTestHelperFile(abiEvents(abi).toJS(), contractName),
    { parser: 'typescript', semi: false },
  )

  const filePath = path.join(directory, `tests/${strings.kebabCase(contractName)}-utils.ts`)
  await fs.writeFile(filePath, utilsFile, { encoding: 'utf-8' })
}

const generateTestHelperFile = (events, contractName) => {
  const eventsNames = events.map(event => event.name)
  const eventsTypes = events.flatMap(event => event.inputs.map(input => ascTypeForEthereum(input.type))).filter(type => !isNativeType(type))
  const importedTypes = [...new Set(eventsTypes)].join(', ');

  let utils = `import { newMockEvent } from 'matchstick-as';
  import { ethereum, ${importedTypes} } from '@graphprotocol/graph-ts';
  import { ${eventsNames.join(', ')} } from '../generated/${contractName}/${contractName}';
  `

  events.forEach(function(event) {
    utils = utils.concat("\n", generateMockedEvent(event))
  });

  return utils
}

const generateMockedEvent = (event) => {
  const varName = `${strings.camelCase(event.name)}Event`
  const fnArgs = event.inputs.map(input => `${input.name}: ${ascTypeForEthereum(input.type)}`);
  const ascToEth = event.inputs.map(input => `${varName}.parameters.push(new ethereum.EventParam("${input.name}", ${ethereumFromAsc(input.name, input.type)}))`);

  return  `
    export function create${event._alias}Event(${fnArgs.join(', ')}): ${event._alias} {
      let ${varName} = changetype<${event._alias}>(newMockEvent());

      ${varName}.parameters = new Array();

      ${ascToEth.join('\n')}

      return ${varName};
    }
  `

}

const isNativeType = (type) => {
  let natives = [
    /Array<([a-zA-Z0-9]+)?>/,
    /i32/,
    /string/,
    /boolean/
  ]

  return natives.some(rx => rx.test(type));
}

module.exports = {
  ...module.exports,
  generateScaffold,
  writeScaffold,
  generateDataSource,
  writeABI,
  writeSchema,
  writeMapping,
  writeTestsHelper,
}
