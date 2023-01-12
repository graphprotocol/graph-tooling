import fs from 'fs-extra'
import path from 'path'
import prettier from 'prettier'
import yaml from 'yaml'

import { Spinner, step } from './spinner'
import Scaffold from '../scaffold'
import { generateEventIndexingHandlers } from '../scaffold/mapping'
import { generateEventType, abiEvents } from '../scaffold/schema'
import { generateTestsFiles } from '../scaffold/tests'
import { strings } from 'gluegun'
import { Map } from 'immutable'
import Protocol from '../protocols'
import ABI from '../protocols/ethereum/abi'

export const generateDataSource = async (
  protocol: Protocol,
  contractName: string,
  network: string,
  contractAddress: string,
  abi: ABI,
) => {
  const protocolManifest = protocol.getManifestScaffold()

  return Map.of(
    'kind',
    protocol.name,
    'name',
    contractName,
    'network',
    network,
    'source',
    yaml.parse(
      prettier.format(
        protocolManifest.source({ contract: contractAddress, contractName }),
        { parser: 'yaml' },
      ),
    ),
    'mapping',
    yaml.parse(
      prettier.format(protocolManifest.mapping({ abi, contractName }), {
        parser: 'yaml',
      }),
    ),
  ).asMutable()
}

export const generateScaffold = async (
  {
    protocolInstance,
    abi,
    contract,
    network,
    subgraphName,
    indexEvents,
    contractName = 'Contract',
    node,
  }: {
    protocolInstance: Protocol
    abi: ABI
    contract: string
    network: string
    subgraphName: string
    indexEvents: boolean
    contractName?: string
    node: string
  },
  spinner: Spinner,
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

const writeScaffoldDirectory = async (
  scaffold: any,
  directory: string,
  spinner: Spinner,
) => {
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

export const writeScaffold = async (
  scaffold: any,
  directory: string,
  spinner: Spinner,
) => {
  step(spinner, `Write subgraph to directory`)
  await writeScaffoldDirectory(scaffold, directory, spinner)
}

export const writeABI = async (abi: ABI, contractName: string) => {
  let data = prettier.format(JSON.stringify(abi.data), {
    parser: 'json',
  })

  await fs.writeFile(`./abis/${contractName}.json`, data, { encoding: 'utf-8' })
}

export const writeSchema = async (
  abi: ABI,
  protocol: Protocol,
  schemaPath: string,
  entities: any,
) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi)
        .filter(event => entities.indexOf(event.get('name')) === -1)
        .toJS()
    : []

  let data = prettier.format(
    events.map(event => generateEventType(event, protocol.name)).join('\n\n'),
    {
      parser: 'graphql',
    },
  )

  await fs.appendFile(schemaPath, data, { encoding: 'utf-8' })
}

export const writeMapping = async (
  abi: ABI,
  protocol: Protocol,
  contractName: string,
  entities: any,
) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi)
        .filter(event => entities.indexOf(event.get('name')) === -1)
        .toJS()
    : []

  let mapping = prettier.format(generateEventIndexingHandlers(events, contractName), {
    parser: 'typescript',
    semi: false,
  })

  await fs.writeFile(`./src/${strings.kebabCase(contractName)}.ts`, mapping, {
    encoding: 'utf-8',
  })
}

export const writeTestsFiles = async (
  abi: ABI,
  protocol: Protocol,
  contractName: string,
) => {
  const hasEvents = protocol.hasEvents()
  const events = hasEvents ? abiEvents(abi).toJS() : []

  if (events.length > 0) {
    // If a contract is added to a subgraph that has no tests folder
    await fs.ensureDir('./tests/')

    const testsFiles = generateTestsFiles(contractName, events, true)

    for (const [fileName, content] of Object.entries(testsFiles)) {
      await fs.writeFile(`./tests/${fileName}`, content, {
        encoding: 'utf-8',
      })
    }
  }
}
