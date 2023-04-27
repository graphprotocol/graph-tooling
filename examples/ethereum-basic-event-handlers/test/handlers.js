const path = require('node:path');
const { system, patching, filesystem } = require('gluegun');
const { createApolloFetch } = require('apollo-fetch');
const { ethers } = require('hardhat');
const { expect } = require('chai');

const srcDir = path.join(__dirname, '..');

const fetchSubgraphs = createApolloFetch({ uri: 'http://localhost:8030/graphql' });
const fetchSubgraph = createApolloFetch({
  uri: 'http://localhost:8000/subgraphs/name/test/basic-event-handlers',
});

const waitForSubgraphToBeSynced = async () =>
  new Promise((resolve, reject) => {
    // Wait for 10s
    const deadline = Date.now() + 10 * 1000;

    const checkSubgraphSynced = async () => {
      if (Date.now() > deadline) {
        reject('Timeout while waiting for the subgraph to be synced');
      }

      // Query the subgraph meta data for the indexing status
      const result = await fetchSubgraphs({
        query: `
          {
            statuses: indexingStatusesForSubgraphName(
              subgraphName: "test/basic-event-handlers"
            ) {
              synced
            }
          }
          `,
      });

      if (result.data.statuses[0].synced) {
        setTimeout(resolve, 1000);
      } else {
        setTimeout(checkSubgraphSynced, 500);
      }
    };

    setTimeout(checkSubgraphSynced, 0);
  });

describe('Basic event handlers', () => {
  // Deploy the subgraph once before all tests
  before(async () => {
    const GravatarRegistry = await hre.ethers.getContractFactory('GravatarRegistry');
    const registry = await GravatarRegistry.deploy();
    const accounts = await ethers.getSigners();

    filesystem.copy('template-subgraph.yaml', 'subgraph.yaml', { overwrite: true });
    // Insert its address into subgraph manifest
    await patching.replace(
      path.join(srcDir, 'subgraph.yaml'),
      'DEPLOYED_CONTRACT_ADDRESS',
      registry.address,
    );

    await registry.setMythicalGravatar();
    await registry.createGravatar('Carl', 'https://thegraph.com/img/team/team_04.png');
    await registry
      .connect(accounts[1])
      .createGravatar('Lucas', 'https://thegraph.com/img/team/bw_Lucas.jpg');
    await registry.connect(accounts[0]).updateGravatarName('Nena');
    await registry.connect(accounts[1]).updateGravatarName('Jorge');
    // Create and deploy the subgraph
    await system.run(`yarn codegen`, { cwd: srcDir });
    await system.run(`yarn create-test`, { cwd: srcDir });
    await system.run(`yarn deploy-test`, { cwd: srcDir });

    // Wait for the subgraph to be indexed
    await waitForSubgraphToBeSynced();
  });

  it('all events are indexed', async () => {
    // Query the subgraph for entities
    const result = await fetchSubgraph({
      query: `
        {
          newGravatars(orderBy: id) { id displayName imageUrl }
          updatedGravatars(orderBy: id) { id displayName imageUrl }
        }
      `,
    });

    expect(result.errors).to.be.undefined;
    expect(result.data).to.deep.equal({
      newGravatars: [
        {
          displayName: 'Carl',
          id: '0x1',
          imageUrl: 'https://thegraph.com/img/team/team_04.png',
        },
        {
          displayName: 'Lucas',
          id: '0x2',
          imageUrl: 'https://thegraph.com/img/team/bw_Lucas.jpg',
        },
      ],
      updatedGravatars: [
        {
          displayName: 'Nena',
          id: '0x1',
          imageUrl: 'https://thegraph.com/img/team/team_04.png',
        },
        {
          displayName: 'Jorge',
          id: '0x2',
          imageUrl: 'https://thegraph.com/img/team/bw_Lucas.jpg',
        },
      ],
    });
  });
});
