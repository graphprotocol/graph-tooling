import path from 'path';
import * as toolbox from 'gluegun';
import { runGraphCli } from './util';
import fs from 'fs';

const EXAMPLE_SUBGRAPH_PATH = path.join(__dirname, 'add', 'subgraph');

const TEMP_SUBGRAPH_PATH = path.join(__dirname, 'add', 'tmp-subgraph');

describe('Add command', () => {
  beforeAll(async () => {
    toolbox.filesystem.remove(TEMP_SUBGRAPH_PATH); // If the tests fail before AfterAll is called
    toolbox.filesystem.copy(EXAMPLE_SUBGRAPH_PATH, TEMP_SUBGRAPH_PATH);

    // The add command expects to be run from the root of the subgraph
    // so we need to change the working directory
    process.chdir(TEMP_SUBGRAPH_PATH);
    await runGraphCli(
      [
        'add',
        '0x2E645469f354BB4F5c8a05B3b30A929361cf77eC',
        '--contract-name',
        'Gravatar',
        '--abi',
        `${EXAMPLE_SUBGRAPH_PATH}/abis/Gravity.json`,
      ],
      TEMP_SUBGRAPH_PATH,
    );

    // Change the working directory back to the root of the tests
    process.chdir(`${__dirname}`);
  });

  afterAll(async () => {
    toolbox.filesystem.remove(TEMP_SUBGRAPH_PATH);
  });

  it('should add a new datasource to a subgraph', () => {
    let manifest = fs.readFileSync(`${TEMP_SUBGRAPH_PATH}/subgraph.yaml`);
    let expected = fs.readFileSync(`${__dirname}/add/expected/subgraph.yaml`);

    expect(manifest.equals(expected)).toBe(true);
  });

  it('should not overwrite the ABI file', () => {
    let abi = fs.readFileSync(`${TEMP_SUBGRAPH_PATH}/abis/Gravatar.json`);
    let expected = fs.readFileSync(`${__dirname}/add/expected/Gravatar.json`);

    expect(expected.equals(abi)).toBe(true);
  });
});
