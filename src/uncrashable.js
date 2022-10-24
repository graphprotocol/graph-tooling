let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let yaml = require('yaml')
let { strOptions } = require('yaml/types')
let graphql = require('graphql/language')
const UncrashableValidation = require('./command-helpers/uncrashable/validation/UncrashableValidation.bs.js')

const throwCombinedError = (filename, errors) => {
  throw new Error(
    errors.reduce(
      (msg, e) =>
        `${msg}
  ${e.split('\n').join('\n  ')}`,
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

module.exports = class Uncrashable {
  static async validate(data, graphSchema, { resolveFile }) {
    let ast = graphql.parse(graphSchema.document)
    let entityDefinitions = ast['definitions']
    // Validate the uncrashable config using this schema
    return UncrashableValidation.validate(entityDefinitions, data)
  }

  // Validate that data source names are unique, so they don't overwrite each other.
  static validateUniqueEntityNames(uncrashableConfig) {
    let names = []
    return uncrashableConfig
      .get('entitySettings')
      .reduce((errors, entityName, dataSourceIndex) => {
        let path = ['entitySettings', dataSourceIndex]
        if (names.includes(entityName)) {
          errors = errors.push(
            immutable.fromJS({
              path,
              message: `\
Uncrashable: More than one entity named '${entityName}', entity names must be unique.`,
            }),
          )
        }
        names.push(entityName)
        return errors
      }, immutable.List())
  }

  static async load(
    filename,
    { graphSchema, skipValidation } = { skipValidation: false },
  ) {
    // Load and validate the manifest
    let data = null

    let raw_data = await fs.readFile(filename, 'utf-8')
    data = yaml.parse(raw_data)

    // Helper to resolve files relative to the uncrashable-config
    let resolveFile = maybeRelativeFile =>
      path.resolve(path.dirname(filename), maybeRelativeFile)

    // TODO: Validation for file data sources
    let uncrashableErrors = await Uncrashable.validate(data, graphSchema, { resolveFile })
    if (uncrashableErrors.length > 0) {
      throwCombinedError(filename, uncrashableErrors)
    }

    let uncrashableConfig = immutable.fromJS(data)

    let errors = skipValidation
      ? immutable.List()
      : immutable.List.of(...Uncrashable.validateUniqueEntityNames(uncrashableConfig))

    if (errors.size > 0) {
      throwCombinedError(filename, errors)
    }

    let warnings = immutable.List()

    return {
      result: data,
      warning: warnings.size > 0 ? buildCombinedWarning(filename, warnings) : null,
    }
  }
}
