let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let yaml = require('js-yaml')
let graphql = require('graphql/language')
let validation = require('./validation')
let ABI = require('./abi')

const throwCombinedError = (filename, errors) => {
  throw new Error(
    errors.reduce(
      (msg, e) =>
        `${msg}

    Path: ${e.path.length === 0 ? '/' : e.path.join(' > ')}
    ${e.message}`,
      `Error in ${filename}:`
    )
  )
}

module.exports = class Subgraph {
  static validate(filename, data) {
    // Parse the default subgraph schema
    let schema = graphql.parse(
      fs.readFileSync(path.join(__dirname, '..', 'manifest-schema.graphql'), 'utf-8')
    )

    // Obtain the root `SubgraphManifest` type from the schema
    let rootType = schema.definitions.find(definition => {
      return definition.name.value === 'SubgraphManifest'
    })

    // Validate the subgraph manifest using this schema
    return validation.validateManifest(filename, data, rootType, schema)
  }

  static validateSchema(manifestFilename, manifest) {
    let filename = path.resolve(
      path.dirname(manifestFilename),
      manifest.getIn(['schema', 'file'])
    )
    return immutable.fromJS(validation.validateSchema(filename))
  }

  static validateAbis(manifestFilename, manifest) {
    // Validate that the the "source > abi" reference of all data sources
    // points to an existing ABI in the data source ABIs
    let abiReferenceErrors = manifest
      .get('dataSources')
      .filter(dataSource => dataSource.get('kind') === 'ethereum/contract')
      .reduce((errors, dataSource, dataSourceIndex) => {
        let abiName = dataSource.getIn(['source', 'abi'])
        let abiNames = dataSource.getIn(['mapping', 'abis']).map(abi => abi.get('name'))

        if (abiNames.includes(abiName)) {
          return errors
        } else {
          return errors.push({
            path: ['dataSources', dataSourceIndex, 'source', 'abi'],
            message:
              `ABI name "${abiName}" not found in mapping > abis: ` +
              `${abiNames.toJS()}`,
          })
        }
      }, immutable.List())

    // Validate that all ABI files are valid
    let abiFileErrors = manifest
      .get('dataSources')
      .filter(dataSource => dataSource.get('kind') === 'ethereum/contract')
      .reduce(
        (errors, dataSource, dataSourceIndex) =>
          dataSource.getIn(['mapping', 'abis']).reduce((errors, abi, abiIndex) => {
            try {
              let manifestDir = path.dirname(manifestFilename)
              let filename = path.resolve(manifestDir, abi.get('file'))
              ABI.load(abi.get('name'), filename)
              return errors
            } catch (e) {
              return errors.push({
                path: [
                  'dataSources',
                  dataSourceIndex,
                  'mapping',
                  'abis',
                  abiIndex,
                  'file',
                ],
                message: e.message,
              })
            }
          }, errors),
        immutable.List()
      )

    return abiReferenceErrors.concat(abiFileErrors)
  }

  static validateContractAddresses(manifest) {
    return manifest
      .get('dataSources')
      .filter(dataSource => dataSource.get('kind') === 'ethereum/contract')
      .reduce((errors, dataSource, dataSourceIndex) => {
        let path = ['dataSources', dataSourceIndex, 'source', 'address']
        let address = dataSource.getIn(['source', 'address'])

        if (
          !((address.startsWith('0x') && address.length == 42) || address.length == 40)
        ) {
          if (address.length != 40) {
            return errors.push({
              path,
              message:
                `Contract address must have length 40 (or 42 if prefixed with 0x) ` +
                `but has length ${address.length}: ${address}`,
            })
          }
        }

        let pattern = /^(0x[0-9a-fA-F]{40}|[0-9a-fA-F]{42})$/
        if (pattern.test(address)) {
          return errors
        } else {
          return errors.push({
            path,
            message: `Contract address is not a hexadecimal string: ${address}`,
          })
        }
      }, immutable.List())
  }

  static load(filename) {
    // Load and validate the manifest
    let data = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
    let manifestErrors = Subgraph.validate(filename, data)
    if (manifestErrors.size > 0) {
      throwCombinedError(filename, manifestErrors)
    }

    // Perform other validations
    let manifest = immutable.fromJS(data)
    let errors = Subgraph.validateSchema(filename, manifest)
    errors = errors.concat(Subgraph.validateAbis(filename, manifest))
    errors = errors.concat(Subgraph.validateContractAddresses(manifest))

    if (errors.size > 0) {
      throwCombinedError(filename, errors)
    }

    return manifest
  }

  static write(subgraph, filename) {
    fs.writeFileSync(filename, yaml.safeDump(subgraph.toJS(), { indent: 2 }))
  }
}
