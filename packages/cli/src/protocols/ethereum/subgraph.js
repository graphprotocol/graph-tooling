const ABI = require('./abi')
const DataSourcesExtractor = require('../../command-helpers/data-sources')

module.exports = class EthereumSubgraph {
  constructor(options = {}) {
    this.manifest = options.manifest
    this.resolveFile = options.resolveFile
    this.protocol = options.protocol
  }

  validateManifest() {
    return this.validateAbis()
      .concat(this.validateEvents())
      .concat(this.validateCallFunctions())
  }

  validateAbis() {
    const dataSourcesAndTemplates = DataSourcesExtractor.fromManifest(
      this.manifest,
      this.protocol,
    )

    return dataSourcesAndTemplates.reduce(
      (errors, dataSourceOrTemplate) =>
        errors.concat(
          this.validateDataSourceAbis(
            dataSourceOrTemplate.get('dataSource'),
            dataSourceOrTemplate.get('path'),
          ),
        ),
      [],
    )
  }

  validateDataSourceAbis(dataSource, path) {
    // Validate that the the "source > abi" reference of all data sources
    // points to an existing ABI in the data source ABIs
    let abiName = dataSource.source?.abi
    let abiNames = dataSource.mapping?.abis.map(abi => abi.get('name'))
    let nameErrors = abiNames.includes(abiName)
      ? []
      : [
          {
            path: [...path, 'source', 'abi'],
            message: `\
ABI name '${abiName}' not found in mapping > abis.
Available ABIs:
${abiNames
  .sort()
  .map(name => `- ${name}`)
  .join('\n')}`,
          },
        ]

    // Validate that all ABI files are valid
    let fileErrors = dataSource.mapping?.abis.reduce((errors, abi, abiIndex) => {
      try {
        ABI.load(abi.get('name'), this.resolveFile(abi.get('file')))
        return errors
      } catch (e) {
        return errors.push({
          path: [...path, 'mapping', 'abis', abiIndex, 'file'],
          message: e.message,
        })
      }
    }, [])

    return nameErrors.concat(fileErrors)
  }

  validateEvents() {
    const dataSourcesAndTemplates = DataSourcesExtractor.fromManifest(
      this.manifest,
      this.protocol,
    )

    return dataSourcesAndTemplates.reduce((errors, dataSourceOrTemplate) => {
      return errors.concat(
        this.validateDataSourceEvents(
          dataSourceOrTemplate.get('dataSource'),
          dataSourceOrTemplate.get('path'),
        ),
      )
    }, [])
  }

  validateDataSourceEvents(dataSource, path) {
    let abi
    try {
      // Resolve the source ABI name into a real ABI object
      let abiName = dataSource.source?.abi
      let abiEntry = dataSource.mapping?.abis.find(abi => abi.get('name') === abiName)
      abi = ABI.load(abiEntry.get('name'), this.resolveFile(abiEntry.get('file')))
    } catch (_) {
      // Ignore errors silently; we can't really say anything about
      // the events if the ABI can't even be loaded
      return []
    }

    // Obtain event signatures from the mapping
    let manifestEvents = (dataSource.mapping?.eventHandlers || []).map(handler =>
      handler.get('event'),
    )

    // Obtain event signatures from the ABI
    let abiEvents = abi.eventSignatures()

    // Add errors for every manifest event signature that is not
    // present in the ABI
    return manifestEvents.reduce(
      (errors, manifestEvent, index) =>
        abiEvents.includes(manifestEvent)
          ? errors
          : errors.push({
              path: [...path, 'eventHandlers', index],
              message: `\
Event with signature '${manifestEvent}' not present in ABI '${abi.name}'.
Available events:
${abiEvents
  .sort()
  .map(event => `- ${event}`)
  .join('\n')}`,
            }),
      [],
    )
  }

  validateCallFunctions() {
    return this.manifest
      .get('dataSources')
      .filter(dataSource => this.protocol.isValidKindName(dataSource.get('kind')))
      .reduce((errors, dataSource, dataSourceIndex) => {
        let path = ['dataSources', dataSourceIndex, 'callHandlers']

        let abi
        try {
          // Resolve the source ABI name into a real ABI object
          let abiName = dataSource.source?.abi
          let abiEntry = dataSource.mapping?.abis.find(abi => abi.get('name') === abiName)
          abi = ABI.load(abiEntry.get('name'), this.resolveFile(abiEntry.get('file')))
        } catch (e) {
          // Ignore errors silently; we can't really say anything about
          // the call functions if the ABI can't even be loaded
          return errors
        }

        // Obtain event signatures from the mapping
        let manifestFunctions = (dataSource.mapping?.callHandlers || []).map(handler =>
          handler.get('function'),
        )

        // Obtain event signatures from the ABI
        let abiFunctions = abi.callFunctionSignatures()

        // Add errors for every manifest event signature that is not
        // present in the ABI
        return manifestFunctions.reduce(
          (errors, manifestFunction, index) =>
            abiFunctions.includes(manifestFunction)
              ? errors
              : errors.push({
                  path: [...path, index],
                  message: `\
Call function with signature '${manifestFunction}' not present in ABI '${abi.name}'.
Available call functions:
${abiFunctions
  .sort()
  .map(tx => `- ${tx}`)
  .join('\n')}`,
                }),
          errors,
        )
      }, [])
  }

  handlerTypes() {
    return ['blockHandlers', 'callHandlers', 'eventHandlers']
  }
}
