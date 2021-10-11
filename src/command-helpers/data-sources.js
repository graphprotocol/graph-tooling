const { loadManifest } = require('../migrations/util/load-manifest')

const getDataSourcesAndTemplates = async manifestPath => {
  const { dataSources = [], templates = [] } = await loadManifest(manifestPath)

  return dataSources.concat(templates)
}

module.exports = {
  getDataSourcesAndTemplates,
}
