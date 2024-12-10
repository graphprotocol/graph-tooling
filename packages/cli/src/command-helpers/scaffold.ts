import path from 'node:path';
import fs from 'fs-extra';
import { strings } from 'gluegun';
import { Map } from 'immutable';
import prettier from 'prettier';
import yaml from 'yaml';
import ABI from '../protocols/ethereum/abi.js';
import Protocol from '../protocols/index.js';
import Scaffold from '../scaffold/index.js';
import { generateEventIndexingHandlers } from '../scaffold/mapping.js';
import { abiEvents, generateEventType } from '../scaffold/schema.js';
import { generateTestsFiles } from '../scaffold/tests.js';
import { Spinner, step } from './spinner.js';

export const generateDataSource = async (
  protocol: Protocol,
  contractName: string,
  network: string,
  contractAddress: string,
  abi: ABI,
  startBlock?: string,
) => {
  const protocolManifest = protocol.getManifestScaffold();

  return Map([
    ['kind', protocol.name],
    ['name', contractName],
    ['network', network],
    [
      'source',
      yaml.parse(
        await prettier.format(
          protocolManifest.source({
            contract: contractAddress,
            contractName,
            startBlock,
          }),
          {
            parser: 'yaml',
          },
        ),
      ),
    ],
    [
      'mapping',
      yaml.parse(
        await prettier.format(protocolManifest.mapping({ abi, contractName }), {
          parser: 'yaml',
        }),
      ),
    ],
  ]).asMutable();
};

export const generateScaffold = async (
  {
    protocolInstance,
    abi,
    source,
    network,
    subgraphName,
    indexEvents,
    contractName = 'Contract',
    startBlock,
    node,
    spkgPath,
    entities,
  }: {
    protocolInstance: Protocol;
    abi: ABI;
    source: string;
    network: string;
    subgraphName: string;
    indexEvents: boolean;
    contractName?: string;
    startBlock?: string;
    node?: string;
    spkgPath?: string;
    entities?: string[];
  },
  spinner: Spinner,
) => {
  step(spinner, 'Generate subgraph');

  const scaffold = new Scaffold({
    protocol: protocolInstance,
    abi,
    indexEvents,
    contract: source,
    network,
    contractName,
    startBlock,
    subgraphName,
    node,
    spkgPath,
    entities,
  });

  return await scaffold.generate();
};

const writeScaffoldDirectory = async (scaffold: any, directory: string, spinner: Spinner) => {
  // Create directory itself
  await fs.mkdirs(directory);

  const promises = Object.keys(scaffold).map(async basename => {
    const content = scaffold[basename];
    const filename = path.join(directory, basename);

    // Write file or recurse into subdirectory
    if (typeof content === 'string' || Buffer.isBuffer(content)) {
      await fs.writeFile(filename, content, 'utf-8');
    } else if (content == null) {
      return; // continue loop
    } else {
      writeScaffoldDirectory(content, path.join(directory, basename), spinner);
    }
  });

  await Promise.all(promises);
};

export const writeScaffold = async (scaffold: any, directory: string, spinner: Spinner) => {
  step(spinner, `Write subgraph to directory`);
  await writeScaffoldDirectory(scaffold, directory, spinner);
};

export const writeABI = async (abi: ABI, contractName: string) => {
  const data = await prettier.format(JSON.stringify(abi.data), {
    parser: 'json',
  });

  await fs.writeFile(`./abis/${contractName}.json`, data, 'utf-8');
};

export const writeSchema = async (
  abi: ABI,
  protocol: Protocol,
  schemaPath: string,
  entities: any,
  contractName: string,
) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi)
        .filter(event => !entities.includes(event.get('name')))
        .toJS()
    : [];

  const data = await prettier.format(
    events.map(event => generateEventType(event, protocol.name, contractName)).join('\n\n'),
    {
      parser: 'graphql',
    },
  );

  await fs.appendFile(schemaPath, data, { encoding: 'utf-8' });
};

export const writeMapping = async (
  abi: ABI,
  protocol: Protocol,
  contractName: string,
  entities: any,
) => {
  const events = protocol.hasEvents()
    ? abiEvents(abi)
        .filter(event => !entities.includes(event.get('name')))
        .toJS()
    : [];

  const mapping = await prettier.format(generateEventIndexingHandlers(events, contractName), {
    parser: 'typescript',
    semi: false,
  });

  await fs.writeFile(`./src/${strings.kebabCase(contractName)}.ts`, mapping, 'utf-8');
};

export const writeTestsFiles = async (abi: ABI, protocol: Protocol, contractName: string) => {
  const hasEvents = protocol.hasEvents();
  const events = hasEvents ? abiEvents(abi).toJS() : [];

  if (events.length > 0) {
    // If a contract is added to a subgraph that has no tests folder
    await fs.ensureDir('./tests/');

    const testsFiles = await generateTestsFiles(contractName, events, true);

    for (const [fileName, content] of Object.entries(testsFiles)) {
      await fs.writeFile(`./tests/${fileName}`, content, 'utf-8');
    }
  }
};
