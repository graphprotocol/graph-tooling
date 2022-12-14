const { loadManifest } = require('../migrations/util/load-manifest')

// Loads manifest from file path and returns all:
// - data sources
// - templates
// In a single list.
const fromFilePath = async manifestPath => {
  const { dataSources = [], templates = [] } = await loadManifest(manifestPath)

  return dataSources.concat(templates)
}

const extractDataSourceByType = (manifest, dataSourceType, protocol) =>
  manifest
    .get(dataSourceType, [])
    .reduce(
      (dataSources, dataSource, dataSourceIndex) =>
      protocol.isValidKindName(dataSource.get('kind'))
      ? dataSources.push(
        { path: [dataSourceType, dataSourceIndex], dataSource },
      )
      : dataSources,
      []
    )

// Extracts data sources and templates from a immutable manifest data structure
const fromManifest = (manifest, protocol) => {
  const dataSources = extractDataSourceByType(manifest, 'dataSources', protocol)
  const templates = extractDataSourceByType(manifest, 'templates', protocol)

  return dataSources.concat(templates)
}

module.exports = {
  fromFilePath,
  fromManifest,
}
