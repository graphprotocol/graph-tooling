const { initNetworksConfig, updateSubgraphNetwork } = require('../command-helpers/network')
const toolbox = require('gluegun/toolbox')
const yaml = require('yaml')
const path = require('path')

const SUBGRAPH_PATH_BASE = path.join(__dirname,'..','..','..','..','examples','example-subgraph')

describe('initNetworksConfig', () => {
  beforeAll(async () => {
    await initNetworksConfig(toolbox, SUBGRAPH_PATH_BASE, 'address')
  })
  afterAll(async () => {
    await toolbox.filesystem.remove(`${SUBGRAPH_PATH_BASE}/networks.json`)
  })

  test('generates networks.json from subgraph.yaml', () => {
    expect(toolbox.filesystem.exists(`${SUBGRAPH_PATH_BASE}/networks.json`)).toBe('file')
  })

  test('Populates the networks.json file with the data from subgraph.yaml', async () => {
    let networksStr = await toolbox.filesystem.read(`${SUBGRAPH_PATH_BASE}/networks.json`)
    let networks = JSON.parse(networksStr)

    let expected = {
      mainnet: {
        ExampleSubgraph: { address: '0x22843e74c59580b3eaf6c233fa67d8b7c561a835' }
      }
    }

    expect(networks).toStrictEqual(expected)
  })
})

describe('updateSubgraphNetwork', () => {
  beforeAll(async () => {
    let content = {
      optimism: {
        ExampleSubgraph: { address: '0x12345...' }
      }
    }

    await toolbox.filesystem.write(`${SUBGRAPH_PATH_BASE}/networks.json`, content)
    await toolbox.filesystem.copy(`${SUBGRAPH_PATH_BASE}/subgraph.yaml`, `${SUBGRAPH_PATH_BASE}/subgraph_copy.yaml`)
  })

  afterAll(async () => {
    await toolbox.filesystem.remove(`${SUBGRAPH_PATH_BASE}/networks.json`)
    await toolbox.filesystem.remove(`${SUBGRAPH_PATH_BASE}/subgraph_copy.yaml`)
  })

  test('Updates subgraph.yaml', async () => {
    let manifest = `${SUBGRAPH_PATH_BASE}/subgraph_copy.yaml`
    let networksFie = `${SUBGRAPH_PATH_BASE}/networks.json`
    let subgraph = await toolbox.filesystem.read(manifest)
    let subgraphObj = yaml.parse(subgraph)

    let network = subgraphObj.dataSources[0].network
    let address = subgraphObj.dataSources[0].source.address

    expect(network).toBe('mainnet')
    expect(address).toBe('0x22843e74c59580b3eaf6c233fa67d8b7c561a835')

    await updateSubgraphNetwork(
      toolbox,
      manifest,
      'optimism',
      networksFie,
      'address'
    )

    subgraph = await toolbox.filesystem.read(manifest)
    subgraphObj = yaml.parse(subgraph)

    network = subgraphObj.dataSources[0].network
    address = subgraphObj.dataSources[0].source.address

    expect(network).toBe('optimism')
    expect(address).toBe('0x12345...')
  })

})
