let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let yaml = require('js-yaml')
let graphql = require('graphql/language')
//let validate = require('@graphprotocol/graphql-data-validation')
let validation = require('./validation')

module.exports = class Subgraph {
  static validate(data) {
    // Parse the default subgraph schema
    let schema = graphql.parse(
      fs.readFileSync(path.join(__dirname, '..', 'manifest-schema.graphql'), 'utf-8')
    )

    // Obtain the root `SubgraphManifest` type from the schema
    let rootType = schema.definitions.find(definition => {
      return definition.name.value === 'SubgraphManifest'
    })

    // Validate the subgraph definition using this schema
    let errors = validation.validateManifest(data, rootType, schema)
    if (errors.length > 0) {
      throw new Error(
        errors.reduce(
          (msg, e) =>
            `${msg}\n\nError at ${e.path.length === 0 ? '/' : e.path.join('/')}:\n${
              e.message
            }`,
          ''
        )
      )
    }
  }

  static load(filename) {
    let data = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
    Subgraph.validate(data)
    return immutable.fromJS(data)
  }

  static write(subgraph, filename) {
    fs.writeFileSync(filename, yaml.safeDump(subgraph.toJS(), { indent: 2 }))
  }
}
