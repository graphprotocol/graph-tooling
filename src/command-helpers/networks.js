const { filesystem, patching, print } = require('gluegun')
const yaml = require('yaml')
const { step, withSpinner } = require('../command-helpers/spinner')

const updateSubgraphNetwork = async (manifest, network, networksFile) => {
    await withSpinner(
      `Update sources network`,
      `Failed to update sources network`,
      `Warnings while updating sources network`,
      async spinner => {
        let networksObj

        try {
          step(spinner, `Reading networks config`)
          networksObj = await filesystem.read(networksFile, "json")
        }  catch (error) {
          print.error(error.message)
          process.exit(1)
        }

        let networkObj = networksObj[network]

        if(!networkObj) {
          print.error(`Could not find network with name '${network}' in '${networksFile}'`)
          process.exit(1)
        }

        await patching.update(manifest, subgraph => {
          let subgraphObj = yaml.parse(subgraph)
          let networkSources = Object.keys(networkObj)

          subgraphObj.dataSources = updateSources(spinner,
            network,
            subgraphObj.dataSources,
            networkSources,
            networkObj
          )

          subgraphObj.templates = updateSources(spinner,
            network,
            subgraphObj.templates,
            networkSources,
            networkObj
          )

          let yaml_doc = new yaml.Document()
          yaml_doc.contents = subgraphObj
          return yaml_doc.toString()
        })
    })
}

function updateSources(spinner, network, sources, networkSources, networkObj) {
  sources.forEach(source => {
      if (!networkSources.includes(source.name)) {
        step(spinner, `Skip '${source.name}': Not found in networks config`)
        return
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

function hasChanges(network, networkObj, dataSource) {
  let networkChanged = dataSource.network !== network

  let addressChanged = (network === "near") ? networkObj.account !== dataSource.source.account : networkObj.address !== dataSource.source.address

  let startBlockChanged = networkObj.startBlock !== dataSource.source.startBlock

  return networkChanged || addressChanged || startBlockChanged
}

module.exports = {
  updateSubgraphNetwork,
}
