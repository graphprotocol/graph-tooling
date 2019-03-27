const fs = require('fs')
const graphql = require('graphql/language')
const immutable = require('immutable')

const List = immutable.List
const Map = immutable.Map

// Builtin scalar types
const BUILTIN_SCALAR_TYPES = [
  'Boolean',
  'Int',
  'BigDecimal',
  'String',
  'BigInt',
  'Bytes',
  'ID',
]

// Type suggestions for common mistakes
const TYPE_SUGGESTIONS = {
  Address: 'Bytes',
  address: 'Bytes',
  bytes: 'Bytes',
  string: 'String',
  bool: 'Boolean',
  boolean: 'Boolean',
  Bool: 'Boolean',
  int: 'Int',
  float: 'Float',
  uint128: 'BigInt',
  int128: 'BigInt',
  uint256: 'BigInt',
  int256: 'BigInt',
}

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
          entity: def.name.value,
          message: `Defined without @entity directive`,
        },
      ])

const validateEntityID = def => {
  let idField = def.fields.find(field => field.name.value === 'id')

  if (idField === undefined) {
    return immutable.fromJS([
      {
        loc: def.loc,
        entity: def.name.value,
        message: `Missing field: id: ID!`,
      },
    ])
  }

  if (
    idField.type.kind === 'NonNullType' &&
    idField.type.type.kind === 'NamedType' &&
    idField.type.type.name.value === 'ID'
  ) {
    return List()
  } else {
    return immutable.fromJS([
      {
        loc: idField.loc,
        entity: def.name.value,
        message: `Field 'id': Entity IDs must be of type ID!`,
      },
    ])
  }
}

const validateListFieldType = (def, field) =>
  field.type.kind === 'NonNullType' &&
  field.type.kind === 'ListType' &&
  field.type.type.kind !== 'NonNullType'
    ? immutable.fromJS([
        {
          loc: field.loc,
          entity: def.name.value,
          message: `\
Field '${field.name.value}':
Field has type [${field.type.type.name.value}]! but
must have type [${field.type.type.name.value}!]!

Reason: Lists with null elements are not supported.`,
        },
      ])
    : field.type.kind === 'ListType' && field.type.type.kind !== 'NonNullType'
      ? immutable.fromJS([
          {
            loc: field.loc,
            entity: def.name.value,
            message: `\
Field '${field.name.value}':
Field has type [${field.type.type.name.value}] but
must have type [${field.type.type.name.value}!]

Reason: Lists with null elements are not supported.`,
          },
        ])
      : List()

const validateInnerFieldType = (defs, def, field) => {
  let innerTypeFromList = listType =>
    listType.type.kind === 'NonNullType'
      ? innerTypeFromNonNull(listType.type)
      : listType.type

  let innerTypeFromNonNull = nonNullType =>
    nonNullType.type.kind === 'ListType'
      ? innerTypeFromList(nonNullType.type)
      : nonNullType.type

  // Obtain the inner-most type from the field
  let innerType =
    field.type.kind === 'NonNullType'
      ? innerTypeFromNonNull(field.type)
      : field.type.kind === 'ListType'
        ? innerTypeFromList(field.type)
        : field.type

  // Get the name of the type
  let typeName = innerType.name.value

  // Look up a possible suggestion for the type to catch common mistakes
  let suggestion = TYPE_SUGGESTIONS[typeName]

  // Collect all types that we can use here: built-ins + entities + enums + interfaces
  let availableTypes = List.of(
    ...BUILTIN_SCALAR_TYPES,
    ...defs
      .filter(
        def =>
          def.kind === 'ObjectTypeDefinition' ||
          def.kind === 'EnumTypeDefinition' ||
          def.kind === 'InterfaceTypeDefinition'
      )
      .map(def => def.name.value)
  )

  // Check whether the type name is available, otherwise return an error
  return availableTypes.includes(typeName)
    ? List()
    : immutable.fromJS([
        {
          loc: field.loc,
          entity: def.name.value,
          message: `\
Field '${field.name.value}': \
Unknown type '${typeName}'.${
            suggestion !== undefined ? ` Did you mean '${suggestion}'?` : ''
          }`,
        },
      ])
}

const validateEntityFieldType = (defs, def, field) =>
  List.of(
    ...validateListFieldType(def, field),
    ...validateInnerFieldType(defs, def, field)
  )

const validateEntityFieldArguments = (defs, def, field) =>
  field.arguments.length > 0
    ? immutable.fromJS([
        {
          loc: field.loc,
          entity: def.name.value,
          message: `\
Field '${field.name.value}': \
Field arguments are not supported.`,
        },
      ])
    : List()

const validateEntityFields = (defs, def) =>
  def.fields.reduce(
    (errors, field) =>
      errors
        .concat(validateEntityFieldType(defs, def, field))
        .concat(validateEntityFieldArguments(defs, def, field)),
    List()
  )

const typeDefinitionValidators = {
  ObjectTypeDefinition: (defs, def) =>
    List.of(
      ...validateEntityDirective(def),
      ...validateEntityID(def),
      ...validateEntityFields(defs, def)
    ),
}

const validateTypeDefinition = (defs, def) =>
  typeDefinitionValidators[def.kind] !== undefined
    ? typeDefinitionValidators[def.kind](defs, def)
    : List()

const validateTypeDefinitions = defs =>
  defs.reduce((errors, def) => errors.concat(validateTypeDefinition(defs, def)), List())

const validateSchema = filename => {
  let doc = loadSchema(filename)
  let schema = parseSchema(doc)
  return validateTypeDefinitions(schema.definitions)
}

module.exports = { validateSchema }
