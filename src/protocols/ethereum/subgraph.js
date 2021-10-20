const immutable = require('immutable')
const ABI = require('./abi')
const DataSourcesExtractor = require('../../command-helpers/data-sources')
const { validateContractValues } = require('../../validation')

module.exports = class EthereumSubgraph {
  constructor(options = {}) {
    this.manifest = options.manifest
    this.resolveFile = options.resolveFile
    this.protocol = options.protocol
  }

  validateManifest() {
    return this.validateAbis()
      .concat(this.validateContractAddresses())
      .concat(this.validateEvents())
      .concat(this.validateCallFunctions())
  }

  validateAbis() {
    const dataSourcesAndTemplates = DataSourcesExtractor.fromManifest(this.manifest, this.protocol)

    return dataSourcesAndTemplates.reduce(
      (errors, dataSourceOrTemplate) =>
        errors.concat(
          this.validateDataSourceAbis(
            dataSourceOrTemplate.get('dataSource'),
            dataSourceOrTemplate.get('path'),
          ),
        ),
      immutable.List(),
    )
  }

  validateDataSourceAbis(dataSource, path) {
    // Validate that the the "source > abi" reference of all data sources
    // points to an existing ABI in the data source ABIs
    let abiName = dataSource.getIn(['source', 'abi'])
    let abiNames = dataSource.getIn(['mapping', 'abis']).map(abi => abi.get('name'))
    let nameErrors = abiNames.includes(abiName)
      ? immutable.List()
      : immutable.fromJS([
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
        ])

    // Validate that all ABI files are valid
    let fileErrors = dataSource
      .getIn(['mapping', 'abis'])
      .reduce((errors, abi, abiIndex) => {
        try {
          ABI.load(abi.get('name'), this.resolveFile(abi.get('file')))
          return errors
        } catch (e) {
          return errors.push(
            immutable.fromJS({
              path: [...path, 'mapping', 'abis', abiIndex, 'file'],
              message: e.message,
            }),
          )
        }
      }, immutable.List())

    return nameErrors.concat(fileErrors)
  }

  validateContractAddresses() {
    const ethereumAddressPattern = /^(0x)?[0-9a-fA-F]{40}$/

    return validateContractValues(
      this.manifest,
      this.protocol,
      'address',
      address => ethereumAddressPattern.test(address),
      "Must be 40 hexadecimal characters, with an optional '0x' prefix.",
    )
  }

  validateEvents() {
    const dataSourcesAndTemplates = DataSourcesExtractor.fromManifest(this.manifest, this.protocol)

    return dataSourcesAndTemplates
      .reduce((errors, dataSourceOrTemplate) => {
        return errors.concat(
          this.validateDataSourceEvents(
            dataSourceOrTemplate.get('dataSource'),
            dataSourceOrTemplate.get('path'),
          ),
        )
      }, immutable.List())
  }

  validateDataSourceEvents(dataSource, path) {
    let abi
    try {
      // Resolve the source ABI name into a real ABI object
      let abiName = dataSource.getIn(['source', 'abi'])
      let abiEntry = dataSource
        .getIn(['mapping', 'abis'])
        .find(abi => abi.get('name') === abiName)
      abi = ABI.load(abiEntry.get('name'), this.resolveFile(abiEntry.get('file')))
    } catch (_) {
      // Ignore errors silently; we can't really say anything about
      // the events if the ABI can't even be loaded
      return immutable.List()
    }

    // Obtain event signatures from the mapping
    let manifestEvents = dataSource
      .getIn(['mapping', 'eventHandlers'], immutable.List())
      .map(handler => handler.get('event'))

    // Obtain event signatures from the ABI
    let abiEvents = abi.eventSignatures()

    // Add errors for every manifest event signature that is not
    // present in the ABI
    return manifestEvents.reduce(
      (errors, manifestEvent, index) =>
        abiEvents.includes(manifestEvent)
          ? errors
          : errors.push(
              immutable.fromJS({
                path: [...path, 'eventHandlers', index],
                message: `\
Event with signature '${manifestEvent}' not present in ABI '${abi.name}'.
Available events:
${abiEvents
  .sort()
  .map(event => `- ${event}`)
  .join('\n')}`,
              }),
            ),
      immutable.List(),
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
          let abiName = dataSource.getIn(['source', 'abi'])
          let abiEntry = dataSource
            .getIn(['mapping', 'abis'])
            .find(abi => abi.get('name') === abiName)
          abi = ABI.load(abiEntry.get('name'), this.resolveFile(abiEntry.get('file')))
        } catch (e) {
          // Ignore errors silently; we can't really say anything about
          // the call functions if the ABI can't even be loaded
          return errors
        }

        // Obtain event signatures from the mapping
        let manifestFunctions = dataSource
          .getIn(['mapping', 'callHandlers'], immutable.List())
          .map(handler => handler.get('function'))

        // Obtain event signatures from the ABI
        let abiFunctions = abi.callFunctionSignatures()

        // Add errors for every manifest event signature that is not
        // present in the ABI
        return manifestFunctions.reduce(
          (errors, manifestFunction, index) =>
            abiFunctions.includes(manifestFunction)
              ? errors
              : errors.push(
                  immutable.fromJS({
                    path: [...path, index],
                    message: `\
Call function with signature '${manifestFunction}' not present in ABI '${abi.name}'.
Available call functions:
${abiFunctions
  .sort()
  .map(tx => `- ${tx}`)
  .join('\n')}`,
                  }),
                ),
          errors,
        )
      }, immutable.List())
  }

  handlerTypes() {
    return immutable.List([
      'blockHandlers',
      'callHandlers',
      'eventHandlers',
    ])
  }
}
