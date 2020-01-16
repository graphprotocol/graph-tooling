const path = require('path')
const { system, patching } = require('gluegun')
const { createApolloFetch } = require('apollo-fetch')

const GravatarRegistry = artifacts.require('./GravatarRegistry.sol')

const srcDir = path.join(__dirname, '..')

const fetchSubgraphs = createApolloFetch({ uri: 'http://localhost:18030/graphql' })
const fetchSubgraph = createApolloFetch({
  uri: 'http://localhost:18000/subgraphs/name/test/basic-event-handlers',
})

const waitForSubgraphToBeSynced = async () =>
  new Promise((resolve, reject) => {
    // Wait for 10s
    let deadline = Date.now() + 10 * 1000

    const checkSubgraphSynced = async () => {
      if (Date.now() > deadline) {
        reject('Timeout while waiting for the subgraph to be synced')
      }

      // Query the subgraph meta data for the indexing status
      let result = await fetchSubgraphs({
        query: `
          {
            statuses: indexingStatusesForSubgraphName(
              subgraphName: "test/basic-event-handlers"
            ) {
              synced
            }
          }
          `,
      })

      if (
        JSON.stringify(result.data) === JSON.stringify({ statuses: [{ synced: true }] })
      ) {
        setTimeout(resolve, 1000)
      } else {
        setTimeout(checkSubgraphSynced, 500)
      }
    }

    setTimeout(checkSubgraphSynced, 0)
  })

contract('Basic event handlers', accounts => {
  // Deploy the subgraph once before all tests
  before(async () => {
    // Deploy the contract
    const registry = await GravatarRegistry.deployed()

    // Insert its address into subgraph manifest
    await patching.replace(
      path.join(srcDir, 'subgraph.yaml'),
      '0x2E645469f354BB4F5c8a05B3b30A929361cf77eC',
      registry.address,
    )

    // Create and deploy the subgraph
    await system.run(`yarn codegen`, { cwd: srcDir })
    await system.run(`yarn create-test`, { cwd: srcDir })
    await system.run(`yarn deploy-test`, { cwd: srcDir })

    // Wait for the subgraph to be indexed
    await waitForSubgraphToBeSynced()
  })

  it('all events are indexed', async () => {
    // Query the subgraph for entities
    let result = await fetchSubgraph({
      query: `
        {
          newGravatars(orderBy: id) { id displayName imageUrl }
          updatedGravatars(orderBy: id) { id displayName imageUrl }
        }
      `,
    })

    expect(result.errors).to.be.undefined
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
    })
  })
})
