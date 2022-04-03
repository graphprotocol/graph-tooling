const path = require('path')
const yaml = require('yaml')
const { step, withSpinner } = require('../command-helpers/spinner')

const updateSubgraphNetwork = async (toolbox, manifest, network, networksFile, identifierName) =>
  await withSpinner(
    `Update sources network`,
    `Failed to update sources network`,
    `Warnings while updating sources network`,
    async spinner => {
      let allNetworks

      step(spinner, `Reading networks config`)
      allNetworks = await toolbox.filesystem.read(networksFile, "json")
      let networkConfig = allNetworks[network]

      // Exit if the network passed with --network does not exits in networks.json
      if(!networkConfig) {
        throw new Error(`Network '${network}' was not found in '${networksFile}'`)
      }

      await toolbox.patching.update(manifest, content => {
        let subgraph = yaml.parse(content)
        let networkSources = Object.keys(networkConfig)
        let subgraphSources = subgraph.dataSources.map(value => value.name);

        // Update the dataSources network config
        subgraph.dataSources = subgraph.dataSources.map(source => {
            if (!networkSources.includes(source.name)) {
              throw new Error(`'${source.name}' was not found in the '${network}' configuration, please update!`)
            }

            if (hasChanges(identifierName, network, networkConfig[source.name], source)) {
              step(spinner, `Update '${source.name}' network configuration`)
              source.network = network
              source.source = source.source.abi ? { abi: source.source.abi } : {}
              Object.assign(source.source, networkConfig[source.name])
            } else {
              step(spinner, `Skip '${source.name}': No changes to network configuration`)
            }

            return source
          }
        )

        // All data sources shoud be on the same network,
        // so we have to update the network of all templates too.
        if(subgraph.templates) {
          subgraph.templates = subgraph.templates.map(template => ({
            ...template,
            network,
          }))
        }

        let unsusedSources = networkSources.filter(x => !subgraphSources.includes(x))

        unsusedSources.forEach(source => {
          step(spinner, `dataSource '${source}' from '${networksFile}' not found in ${manifest}`)
        })

        let yaml_doc = new yaml.Document()
        yaml_doc.contents = subgraph
        return yaml_doc.toString()
      })
  })

const initNetworksConfig = async(toolbox, directory, identifierName) =>
  await withSpinner(
    `Initialize networks config`,
    `Failed to initialize networks config`,
    `Warnings while initializing networks config`,
    async spinner => {
      let subgraphStr = await toolbox.filesystem.read(path.join(directory, 'subgraph.yaml'))
      let subgraph = yaml.parse(subgraphStr)

      const networks = subgraph.dataSources.reduce((acc, source) =>
        Object.assign(
          acc,
          {
            [source.network]: {
              [source.name]: {
                [identifierName]: source.source.address,
                startBlock: source.source.startBlock,
              },
            },
          }
        )
      , {})

      await toolbox.filesystem.write(`${directory}/networks.json`, networks)

      return true
    },
  )

// Checks if any network attribute has been changed
function hasChanges(identifierName, network, networkConfig, dataSource) {
  let networkChanged = dataSource.network !== network

  // Return directly if the network is different
  if (networkChanged) return networkChanged

  let addressChanged = networkConfig[identifierName] !== dataSource.source[identifierName]

  let startBlockChanged = networkConfig.startBlock !== dataSource.source.startBlock

  return networkChanged || addressChanged || startBlockChanged
}

module.exports = {
  updateSubgraphNetwork,
  initNetworksConfig
}
