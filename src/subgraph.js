let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let yaml = require('yaml')
let { strOptions } = require('yaml/types')
let graphql = require('graphql/language')
let validation = require('./validation')

const throwCombinedError = (filename, errors) => {
  throw new Error(
    errors.reduce(
      (msg, e) =>
        `${msg}

  Path: ${e.get('path').size === 0 ? '/' : e.get('path').join(' > ')}
  ${e
    .get('message')
    .split('\n')
    .join('\n  ')}`,
      `Error in ${path.relative(process.cwd(), filename)}:`,
    ),
  )
}

const buildCombinedWarning = (filename, warnings) =>
  warnings.size > 0
    ? warnings.reduce(
        (msg, w) =>
          `${msg}

    Path: ${w.get('path').size === 0 ? '/' : w.get('path').join(' > ')}
    ${w
      .get('message')
      .split('\n')
      .join('\n    ')}`,
        `Warnings in ${path.relative(process.cwd(), filename)}:`,
      ) + '\n'
    : null

module.exports = class Subgraph {
  static async validate(data, protocol, { resolveFile }) {
    if (protocol.name == null) {
      return immutable.fromJS([
        {
          path: [],
          message: `Unable to determine for which protocol manifest file is built for. Ensure you have at least one 'dataSources' and/or 'templates' elements defined in your subgraph.`,
        },
      ])
    }

    // Parse the default subgraph schema
    let schema = graphql.parse(
      await fs.readFile(
        path.join(__dirname, 'protocols', protocol.name, `manifest.graphql`),
        'utf-8',
      ),
    )

    // Obtain the root `SubgraphManifest` type from the schema
    let rootType = schema.definitions.find(definition => {
      return definition.name.value === 'SubgraphManifest'
    })

    // Validate the subgraph manifest using this schema
    return validation.validateManifest(data, rootType, schema, protocol, { resolveFile })
  }

  static validateSchema(manifest, { resolveFile }) {
    let filename = resolveFile(manifest.getIn(['schema', 'file']))
    let errors = validation.validateSchema(filename)

    if (errors.size > 0) {
      errors = errors.groupBy(error => error.get('entity')).sort()
      let msg = errors.reduce((msg, errors, entity) => {
        errors = errors.groupBy(error => error.get('directive'))
        let inner_msgs = errors.reduce((msg, errors, directive) => {
          return `${msg}${
            directive
              ? `
    ${directive}:`
              : ''
          }
  ${errors
    .map(error =>
      error
        .get('message')
        .split('\n')
        .join('\n  '),
    )
    .map(msg => `${directive ? '  ' : ''}- ${msg}`)
    .join('\n  ')}`
        }, ``)
        return `${msg}

  ${entity}:${inner_msgs}`
      }, `Error in ${path.relative(process.cwd(), filename)}:`)

      throw new Error(msg)
    }
  }

  static validateRepository(manifest, { resolveFile }) {
    return manifest.get('repository') !==
      'https://github.com/graphprotocol/example-subgraph'
      ? immutable.List()
      : immutable.List().push(
          immutable.fromJS({
            path: ['repository'],
            message: `\
The repository is still set to https://github.com/graphprotocol/example-subgraph.
Please replace it with a link to your subgraph source code.`,
          }),
        )
  }

  static validateDescription(manifest, { resolveFile }) {
    // TODO: Maybe implement this in the future for each protocol example description
    return manifest.get('description', '').startsWith('Gravatar for ')
      ? immutable.List().push(
          immutable.fromJS({
            path: ['description'],
            message: `\
The description is still the one from the example subgraph.
Please update it to tell users more about your subgraph.`,
          }),
        )
      : immutable.List()
  }

  static validateHandlers(manifest, protocol, protocolSubgraph) {
    return manifest
      .get('dataSources')
      .filter(dataSource => protocol.isValidKindName(dataSource.get('kind')))
      .reduce((errors, dataSource, dataSourceIndex) => {
        let path = ['dataSources', dataSourceIndex, 'mapping']

        let mapping = dataSource.get('mapping')

        const handlerTypes = protocolSubgraph.handlerTypes()

        const areAllHandlersEmpty = handlerTypes
          .map(handlerType => mapping.get(handlerType, immutable.List()))
          .every(handlers => handlers.isEmpty())

        const handlerNamesWithoutLast = handlerTypes.pop().join(', ')

        return areAllHandlersEmpty
          ? errors.push(
              immutable.fromJS({
                path: path,
                message: `\
Mapping has no ${handlerNamesWithoutLast} or ${handlerTypes.get(-1)}.
At least one such handler must be defined.`,
              }),
            )
          : errors
      }, immutable.List())
  }

  static validateContractValues(manifest, protocol) {
    if (!protocol.hasContract()){
      return immutable.List()
    }

    return validation.validateContractValues(manifest, protocol)
  }

  // Validate that data source names are unique, so they don't overwrite each other.
  static validateUniqueDataSourceNames(manifest) {
    let names = []
    return manifest.get('dataSources').reduce((errors, dataSource, dataSourceIndex) => {
      let path = ['dataSources', dataSourceIndex, 'name']
      let name = dataSource.get('name')
      if (names.includes(name)) {
        errors = errors.push(
          immutable.fromJS({
            path,
            message: `\
More than one data source named '${name}', data source names must be unique.`,
          }),
        )
      }
      names.push(name)
      return errors
    }, immutable.List())
  }

  static validateUniqueTemplateNames(manifest) {
    let names = []
    return manifest
      .get('templates', immutable.List())
      .reduce((errors, template, templateIndex) => {
        let path = ['templates', templateIndex, 'name']
        let name = template.get('name')
        if (names.includes(name)) {
          errors = errors.push(
            immutable.fromJS({
              path,
              message: `\
More than one template named '${name}', template names must be unique.`,
            }),
          )
        }
        names.push(name)
        return errors
      }, immutable.List())
  }

  static dump(manifest) {
    strOptions.fold.lineWidth = 90
    strOptions.defaultType = 'PLAIN'

    return yaml.stringify(manifest.toJS())
  }

  static async load(filename, { protocol, skipValidation } = { skipValidation: false }) {
    // Load and validate the manifest
    let data = null

    if (filename.match(/.js$/)) {
      data = require(path.resolve(filename))
    } else {
      data = yaml.parse(await fs.readFile(filename, 'utf-8'))
    }

    // Helper to resolve files relative to the subgraph manifest
    let resolveFile = maybeRelativeFile =>
      path.resolve(path.dirname(filename), maybeRelativeFile)

    let manifestErrors = await Subgraph.validate(data, protocol, { resolveFile })
    if (manifestErrors.size > 0) {
      throwCombinedError(filename, manifestErrors)
    }

    let manifest = immutable.fromJS(data)

    // Validate the schema
    Subgraph.validateSchema(manifest, { resolveFile })

    // Perform other validations
    const protocolSubgraph = protocol.getSubgraph({
      manifest,
      resolveFile,
    })

    let errors = skipValidation
      ? immutable.List()
      : immutable.List.of(
          ...protocolSubgraph.validateManifest(),
          ...Subgraph.validateContractValues(manifest, protocol),
          ...Subgraph.validateUniqueDataSourceNames(manifest),
          ...Subgraph.validateUniqueTemplateNames(manifest),
          ...Subgraph.validateHandlers(manifest, protocol, protocolSubgraph),
        )

    if (errors.size > 0) {
      throwCombinedError(filename, errors)
    }

    // Perform warning validations
    let warnings = skipValidation
      ? immutable.List()
      : immutable.List.of(
          ...Subgraph.validateRepository(manifest, { resolveFile }),
          ...Subgraph.validateDescription(manifest, { resolveFile }),
        )

    return {
      result: manifest,
      warning: warnings.size > 0 ? buildCombinedWarning(filename, warnings) : null,
    }
  }

  static async write(manifest, filename) {
    await fs.writeFile(filename, Subgraph.dump(manifest))
  }
}
