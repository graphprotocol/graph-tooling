const path = require('path')
const yaml = require('yaml')
const { step, withSpinner } = require('../command-helpers/spinner')

const updateSubgraphNetwork = async (toolbox, manifest, network, networksFile) =>
  await withSpinner(
    `Update sources network`,
    `Failed to update sources network`,
    `Warnings while updating sources network`,
    async spinner => {
      let networksObj

      try {
        step(spinner, `Reading networks config`)
        networksObj = await toolbox.filesystem.read(networksFile, "json")
      }  catch (error) {
        throw new Error(error.message)
      }

      let networkObj = networksObj[network]

      // Exit if the network passed with --network does not exits in networks.json
      if(!networkObj) {
        throw new Error(`Network '${network}' was not found in '${networksFile}'`)
      }

      await toolbox.patching.update(manifest, subgraph => {
        let subgraphObj = yaml.parse(subgraph)
        let networkSources = Object.keys(networkObj)
        let subgraphSources = subgraphObj.dataSources.map(value => value.name);

        // Update the dataSources network config
        subgraphObj.dataSources = updateSources(
          toolbox,
          spinner,
          network,
          subgraphObj.dataSources,
          networkSources,
          networkObj
        )

        // All data sources shoud be on the same network,
        // so we have to update the network of all templates too.
        if(subgraphObj.templates) {
          subgraphObj.templates = updateTemplates(network, subgraphObj.templates)
        }

        let unsusedSources = networkSources.filter(x => !subgraphSources.includes(x))

        unsusedSources.forEach(source => {
          step(spinner, `Configuration for '${source}' not used`)
        })

        let yaml_doc = new yaml.Document()
        yaml_doc.contents = subgraphObj
        return yaml_doc.toString()
      })
  })

const initNetworksConfig = async(toolbox, directory) =>
  await withSpinner(
    `Initialize networks config`,
    `Failed to initialize networks config`,
    `Warnings while initializing networks config`,
    async spinner => {
      let subgraphStr = await toolbox.filesystem.read(path.join(directory, 'subgraph.yaml'))
      let subgraph = yaml.parse(subgraphStr)

      let networks = {}

      subgraph.dataSources.forEach(source => {
        let sourceNetwork = {[source.name]: {}}

        if (source.source.address) sourceNetwork[source.name]["address"] = source.source.address
        if (source.source.startBlock) sourceNetwork[source.name]["startBlock"] = source.source.startBlock

        networks[source.network] = sourceNetwork
      })

      await toolbox.filesystem.write(`${directory}/networks.json`, networks, {jsonIndent: 4})

      return true
    },
  )

// Iterates through each dataSource and updates the network configuration
// Will update only if there are changes to the configuration
function updateSources(toolbox, spinner, network, sources, networkSources, networkObj) {
  sources.forEach(source => {
      if (!networkSources.includes(source.name)) {
        throw new Error(`'${source.name}' was not found in the '${network}' configuration, please update!`)
      }

      if (hasChanges(network, networkObj[source.name], source)) {
        step(spinner, `Update '${source.name}' network configuration`)
        source.network = network
        source.source = { abi: source.source.abi }
        Object.assign(source.source, networkObj[source.name])
      } else {
        step(spinner, `Skip '${source.name}': No changes to network configuration`)
      }
  })

  return sources
}

// Iterates through each template and updates the network
function updateTemplates(network, sources) {
  sources.forEach(source => {
    if (source.network !== network) source.network = network
  })

  return sources
}

// Checks if any network attribute has been changed
function hasChanges(network, networkObj, dataSource) {
  let networkChanged = dataSource.network !== network

  // Return directly if the network is different
  if (networkChanged) return networkChanged

  let addressChanged = (network === "near")
    ? networkObj.account !== dataSource.source.account
    : networkObj.address !== dataSource.source.address

  let startBlockChanged = networkObj.startBlock !== dataSource.source.startBlock

  return networkChanged || addressChanged || startBlockChanged
}

module.exports = {
  updateSubgraphNetwork,
  initNetworksConfig
}
