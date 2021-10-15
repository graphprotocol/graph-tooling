const immutable = require('immutable')
const { loadManifest } = require('../migrations/util/load-manifest')

// From file path
const getDataSourcesAndTemplates = async manifestPath => {
  const { dataSources = [], templates = [] } = await loadManifest(manifestPath)

  return dataSources.concat(templates)
}

// From in memory immutable data structure
const collectDataSources = (manifest, protocolName) =>
  manifest
    .get('dataSources')
    .reduce(
      (dataSources, dataSource, dataSourceIndex) =>
      dataSource.get('kind') === protocolName
      ? dataSources.push(
        immutable.Map({ path: ['dataSources', dataSourceIndex], dataSource }),
      )
      : dataSources,
      immutable.List(),
    )

const collectDataSourceTemplates = (manifest, protocolName) =>
  manifest.get('templates', immutable.List()).reduce(
    (templates, template, templateIndex) =>
    template.get('kind') === protocolName
    ? templates.push(
      immutable.Map({
        path: ['templates', templateIndex],
        dataSource: template,
      }),
    )
    : templates,
    immutable.List(),
  )

module.exports = {
  getDataSourcesAndTemplates,
  collectDataSources,
  collectDataSourceTemplates,
}
