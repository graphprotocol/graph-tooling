const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const semver = require('semver')
const toolbox = require('gluegun/toolbox')
const yaml = require('yaml')

const ABI = require('../abi')
const Subgraph = require('../subgraph')

const getGraphCliVersion = sourceDir => {
  let pkgJsonFile = path.join(
    sourceDir,
    'node_modules',
    '@graphprotocol',
    'graph-cli',
    'package.json',
  )
  let data = fs.readFileSync(pkgJsonFile)
  let jsonData = JSON.parse(data)
  return jsonData.version
}

const dataSourceHasEventHandlers = dataSource =>
  dataSource &&
  typeof dataSource === 'object' &&
  ((dataSource.mapping &&
    typeof dataSource.mapping === 'object' &&
    dataSource.mapping.eventHandlers &&
    Array.isArray(dataSource.mapping.eventHandlers) &&
    dataSource.mapping.eventHandlers.length > 0) ||
    (dataSource.templates &&
      Array.isArray(dataSource.templates) &&
      dataSource.templates.reduce(
        (hasEventHandlers, template) =>
          hasEventHandlers || dataSourceHasEventHandlers(template),
        false,
      )))

const maybeUpdateEventSignature = (manifestFile, dataSource, event) => {
  let abiName = dataSource.getIn(['source', 'abi'])
  let abis = dataSource.getIn(['mapping', 'abis'], immutable.List())
  let abi = abis.find(abi => abi.get('name') === abiName)
  let name = abi ? abi.get('name') : undefined
  let file = abi ? abi.get('file') : undefined

  let oldEventSignatures
  let newEventSignatures
  if (file && name) {
    try {
      abi = ABI.load(name, path.relative(path.dirname(manifestFile), file))
    } catch (e) {
      // Failed to load the ABI, return the event unchanged
      return event
    }

    oldEventSignatures = abi.oldEventSignatures()
    newEventSignatures = abi.eventSignatures()
  }

  if (oldEventSignatures && newEventSignatures) {
    for (let i = 0; i < oldEventSignatures.size; i++) {
      // Only replace the event signature if the signature of the event has changed
      // and the old signature is not present in the new signatures anymore.
      if (
        event === oldEventSignatures.get(i) &&
        oldEventSignatures.get(i) !== newEventSignatures[i] &&
        !newEventSignatures.contains(event)
      ) {
        return newEventSignatures.get(i)
      }
    }
  }

  // Event signature doesn't need to be updated
  return event
}

const maybeMigrateDataSource = (manifestFile, dataSource) => {
  if (
    dataSource.get('kind') === 'ethereum/contract' &&
    immutable.List.isList(dataSource.getIn(['mapping', 'eventHandlers']))
  ) {
    dataSource = dataSource.updateIn(['mapping', 'eventHandlers'], eventHandlers =>
      eventHandlers.map(eventHandler =>
        eventHandler.update('event', event =>
          maybeUpdateEventSignature(manifestFile, dataSource, event),
        ),
      ),
    )
  }

  if (immutable.List.isList(dataSource.get('templates'))) {
    dataSource = dataSource.update('templates', templates =>
      templates.map(template => maybeMigrateDataSource(manifestFile, template)),
    )
  }

  return dataSource
}

// If any of the manifest apiVersions are 0.0.1, replace them with 0.0.2
module.exports = {
  name: 'Distinguish indexed and non-indexed event parameters',
  predicate: async ({ sourceDir, manifestFile }) => {
    // Obtain the graph-cli version, if possible
    let graphCliVersion
    try {
      graphCliVersion = getGraphCliVersion(sourceDir)
    } catch (_) {
      // If we cannot obtain the version, return a hint that the graph-ts
      // hasn't been installed yet
      return 'graph-cli dependency not installed yet'
    }

    let manifest = yaml.parse(fs.readFileSync(manifestFile, 'utf-8'))
    return (
      // Only migrate if the graph-cli version is > 0.12.0...
      semver.gt(graphCliVersion, '0.12.0') &&
      // ...and we have a manifest with event handlers or templates with event handlers
      manifest &&
      typeof manifest === 'object' &&
      Array.isArray(manifest.dataSources) &&
      manifest.dataSources.reduce(
        (hasEventHandlers, dataSource) =>
          hasEventHandlers || dataSourceHasEventHandlers(dataSource),
        false,
      )
    )
  },
  apply: async ({ manifestFile }) => {
    let subgraph = (await Subgraph.load(manifestFile, { skipValidation: true })).result

    subgraph = subgraph.update('dataSources', dataSources =>
      dataSources.map(dataSource => maybeMigrateDataSource(manifestFile, dataSource)),
    )

    let newManifest = Subgraph.dump(subgraph)
    await toolbox.filesystem.write(manifestFile, newManifest, { atomic: true })
  },
}
