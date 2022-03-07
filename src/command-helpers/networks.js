const { filesystem, patching, print } = require('gluegun')
const yaml = require('yaml')

const updateSubgraphNetwork = async (manifest, network, networksFile) => {
    let networksObj = filesystem.read(networksFile, "json")
    let networkObj = networksObj[network]

    if(!networkObj) {
      print.error(`Could not find network with name '${network}' in '${networksFile}'`)
      process.exitCode = 1
      return
    }

    await patching.update(manifest, subgraph => {
      let subgraphObj = yaml.parse(subgraph)
      let networkSources = Object.keys(networkObj)

      subgraphObj["dataSources"] = updateSources(network, subgraphObj["dataSources"], networkSources, networkObj)
      subgraphObj["templates"] = updateSources(network, subgraphObj['templates'], networkSources, networkObj)

      let yaml_doc = new yaml.Document()
      yaml_doc.contents = subgraphObj
      return yaml_doc.toString()
    })
}

function updateSources(network, sources, networkSources, networkObj) {
  sources.forEach(ds => {
      if (!networkSources.includes(ds.name)) {
        print.info(`Skipping ${ds.name} - not in networks config`)
        return
      }

      let dsNetwork = networkObj[ds.name]

      if (hasChanges(network, dsNetwork, ds)) {
        ds.network = network
        ds.source = { abi: ds.source.abi }
        Object.assign(ds.source, dsNetwork)
      } else {
        print.info(`Skipping ${ds.name} - already on "${network}" network`)
      }
  })

  return sources
}

function hasChanges(network, networkObj, dataSource) {
  let networkChanged = dataSource.network !== network

  let addressChanged

  if (network === "near") {
    addressChanged = networkObj.account !== dataSource.source.account
  } else {
    addressChanged = networkObj.address !== dataSource.source.address
  }

  let startBlockChanged = networkObj.startBlock !== dataSource.source.startBlock

  return networkChanged || addressChanged || startBlockChanged
}

module.exports = {
  updateSubgraphNetwork,
}
