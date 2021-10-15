const immutable = require('immutable')
const { loadManifest } = require('../migrations/util/load-manifest')

// Loads manifest from file path and returns all:
// - data sources
// - templates
// In a single list.
const fromFilePath = async manifestPath => {
  const { dataSources = [], templates = [] } = await loadManifest(manifestPath)

  return dataSources.concat(templates)
}

const extractDataSourceByType = (manifest, dataSourceType, protocolName) =>
  manifest
    .get(dataSourceType, immutable.List())
    .reduce(
      (dataSources, dataSource, dataSourceIndex) =>
      dataSource.get('kind') === protocolName
      ? dataSources.push(
        immutable.Map({ path: [dataSourceType, dataSourceIndex], dataSource }),
      )
      : dataSources,
      immutable.List(),
    )

// Extracts data sources and templates from a immutable manifest data structure
const fromManifest = (manifest, protocolName) => {
  const dataSources = extractDataSourceByType(manifest, 'dataSources', protocolName)
  const templates = extractDataSourceByType(manifest, 'templates', protocolName)

  return dataSources.concat(templates)
}

module.exports = {
  fromFilePath,
  fromManifest,
}
