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
    let errors = validation.validateManifest(data, rootType, schema)
    if (errors.length > 0) {
      throwCombinedError(filename, errors)
    }
  }

  static validateSchema(manifest) {
    return validation.validateSchema(manifest.getIn(['schema', 'file']))
  }

  static validateAbis(filename, manifest) {
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
              ABI.load(abi.get('name'), abi.get('file'))
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

  static load(filename) {
    // Load and validate the manifest
    let data = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
    Subgraph.validate(filename, data)

    // Perform other validations
    let manifest = immutable.fromJS(data)
    let errors = Subgraph.validateSchema(manifest)
    errors = errors.concat(Subgraph.validateAbis(filename, manifest))

    if (errors.length > 0) {
      throwCombinedError(errors)
    }

    return manifest
  }

  static write(subgraph, filename) {
    fs.writeFileSync(filename, yaml.safeDump(subgraph.toJS(), { indent: 2 }))
  }
}
