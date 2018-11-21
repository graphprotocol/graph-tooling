let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let yaml = require('js-yaml')
let graphql = require('graphql/language')
let validation = require('./validation')

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
  }

  static validateSchema(manifest) {
    let filename = manifest.getIn(['schema', 'file'])
    let errors = validation.validateSchema(filename)
    if (errors.length > 0) {
      throw new Error(
        errors.reduce(
          (msg, e) => `${msg}

  ${e.message}`,
          `Error in ${filename}:`
        )
      )
    }
  }

  static load(filename) {
    let data = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
    Subgraph.validate(filename, data)
    let manifest = immutable.fromJS(data)
    Subgraph.validateSchema(manifest)
    return manifest
  }

  static write(subgraph, filename) {
    fs.writeFileSync(filename, yaml.safeDump(subgraph.toJS(), { indent: 2 }))
  }
}
