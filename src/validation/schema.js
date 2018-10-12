const fs = require('fs')
const graphql = require('graphql/language')
const immutable = require('immutable')

const List = immutable.List
const Map = immutable.Map

const loadSchema = filename => {
  try {
    return fs.readFileSync(filename, 'utf-8')
  } catch (e) {
    throw new Error(`Failed to load GraphQL schema: ${e}`)
  }
}

const parseSchema = doc => {
  try {
    return graphql.parse(doc)
  } catch (e) {
    throw new Error(`Invalid GraphQL schema: ${e}`)
  }
}

const validateEntityDirective = def =>
  def.directives.find(directive => directive.name.value === 'entity')
    ? List()
    : immutable.fromJS([
        {
          loc: def.loc,
          message: `Type '${def.name.value}':
  Defined without @entity directive`,
        },
      ])

const validateEntityFieldType = (def, field) =>
  field.type.kind === 'NonNullType' &&
  field.type.kind === 'ListType' &&
  field.type.type.kind !== 'NonNullType'
    ? immutable.fromJS([
        {
          loc: field.loc,
          message: `\
Type '${def.name.value}', field ${field.name.value}: \
Field has type [${field.type.type.name.value}]! but must \
have type [${field.type.type.name.value}!]!
  Reason: Lists with null elements are not supported.
          `,
        },
      ])
    : field.type.kind === 'ListType' && field.type.type.kind !== 'NonNullType'
      ? immutable.fromJS([
          {
            loc: field.loc,
            message: `\
Type '${def.name.value}', field ${field.name.value}: \
Field has type [${field.type.type.name.value}] but must \
have type [${field.type.type.name.value}!]
  Reason: Lists with null elements are not supported.
            `,
          },
        ])
      : List()

const validateEntityFields = def =>
  def.fields.reduce(
    (errors, field) => errors.concat(validateEntityFieldType(def, field)),
    List()
  )

const typeDefinitionValidators = {
  ObjectTypeDefinition: def =>
    validateEntityDirective(def).concat(validateEntityFields(def)),
}

const validateTypeDefinition = def =>
  typeDefinitionValidators[def.kind] !== undefined
    ? typeDefinitionValidators[def.kind](def)
    : List()

const validateTypeDefinitions = defs =>
  defs.reduce((errors, def) => errors.concat(validateTypeDefinition(def)), List())

const validateSchema = filename => {
  let doc = loadSchema(filename)
  let schema = parseSchema(doc)
  return validateTypeDefinitions(schema.definitions).toJS()
}

module.exports = { validateSchema }
