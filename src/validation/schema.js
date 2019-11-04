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
const TYPE_SUGGESTIONS = [
  ['Address', 'Bytes'],
  ['address', 'Bytes'],
  ['bytes', 'Bytes'],
  ['string', 'String'],
  ['bool', 'Boolean'],
  ['boolean', 'Boolean'],
  ['Bool', 'Boolean'],
  ['float', 'BigDecimal'],
  ['Float', 'BigDecimal'],
  ['int', 'Int'],
  ['uint', 'BigInt'],
  [/^(u|uint)(8|16|24)$/, 'Int'],
  [/^(i|int)(8|16|24|32)$/, 'Int'],
  [/^(u|uint)32$/, 'BigInt'],
  [
    /^(u|uint|i|int)(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    'BigInt',
  ],
]

/**
 * Returns a GraphQL type suggestion for a given input type.
 * Returns `undefined` if no suggestion is available for the type.
 */
const typeSuggestion = typeName =>
  TYPE_SUGGESTIONS.filter(([pattern, _]) => {
    return typeof pattern === 'string' ? pattern === typeName : typeName.match(pattern)
  }).map(([_, suggestion]) => suggestion)[0]

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

const unwrapType = type => {
  let innerTypeFromList = listType =>
    listType.type.kind === 'NonNullType'
      ? innerTypeFromNonNull(listType.type)
      : listType.type

  let innerTypeFromNonNull = nonNullType =>
    nonNullType.type.kind === 'ListType'
      ? innerTypeFromList(nonNullType.type)
      : nonNullType.type

  // Obtain the inner-most type from the field
  return type.kind === 'NonNullType'
    ? innerTypeFromNonNull(type)
    : type.kind === 'ListType'
    ? innerTypeFromList(type)
    : type
}

const entityTypeByName = (defs, name) =>
  defs
    .filter(
      def =>
        def.kind === 'InterfaceTypeDefinition' || def.kind === 'ObjectTypeDefinition',
    )
    .filter(def => def.directives.find(directive => directive.name.value === 'entity'))
    .find(def => def.name.value === name)

const fieldTargetEntityName = field => unwrapType(field.type).name.value

const fieldTargetEntity = (defs, field) =>
  entityTypeByName(defs, fieldTargetEntityName(field))

const validateInnerFieldType = (defs, def, field) => {
  let innerType = unwrapType(field.type)

  // Get the name of the type
  let typeName = innerType.name.value

  // Look up a possible suggestion for the type to catch common mistakes
  let suggestion = typeSuggestion(typeName)

  // Collect all types that we can use here: built-ins + entities + enums + interfaces
  let availableTypes = List.of(
    ...BUILTIN_SCALAR_TYPES,
    ...defs
      .filter(
        def =>
          def.kind === 'ObjectTypeDefinition' ||
          def.kind === 'EnumTypeDefinition' ||
          def.kind === 'InterfaceTypeDefinition',
      )
      .map(def => def.name.value),
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
    ...validateInnerFieldType(defs, def, field),
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

const entityFieldExists = (entityDef, name) =>
  entityDef.fields.find(field => field.name.value === name) !== undefined

const validateDerivedFromDirective = (defs, def, field, directive) => {
  // Validate that there is a `field` argument and nothing else
  if (directive.arguments.length !== 1 || directive.arguments[0].name.value !== 'field') {
    return immutable.fromJS([
      {
        loc: directive.loc,
        entity: def.name.value,
        message: `\
Field '${field.name.value}': \
@derivedFrom directive must have a 'field' argument`,
      },
    ])
  }

  // Validate that the "field" argument value is a string
  if (directive.arguments[0].value.kind !== 'StringValue') {
    return immutable.fromJS([
      {
        loc: directive.loc,
        entity: def.name.value,
        message: `\
Field '${field.name.value}': \
Value of the @derivedFrom 'field' argument must be a string`,
      },
    ])
  }

  let targetEntity = fieldTargetEntity(defs, field)
  if (targetEntity === undefined) {
    // This is handled in `validateInnerFieldType` but if we don't catch
    // the undefined case here, the code below will throw, as it assumes
    // the target entity exists
    return immutable.fromJS([])
  }

  let derivedFromField = targetEntity.fields.find(
    field => field.name.value === directive.arguments[0].value.value,
  )

  if (derivedFromField === undefined) {
    return immutable.fromJS([
      {
        loc: directive.loc,
        entity: def.name.value,
        message: `\
Field '${field.name.value}': \
@derivedFrom field '${directive.arguments[0].value.value}' \
does not exist on type '${targetEntity.name.value}'`,
      },
    ])
  }

  let backrefTypeName = unwrapType(derivedFromField.type)
  let backRefEntity = entityTypeByName(defs, backrefTypeName.name.value)

  if (!backRefEntity || backRefEntity.name.value !== def.name.value) {
    return immutable.fromJS([
      {
        loc: directive.loc,
        entity: def.name.value,
        message: `\
Field '${field.name.value}': \
@derivedFrom field '${directive.arguments[0].value.value}' \
on type '${targetEntity.name.value}' must have the type \
'${def.name.value}', '${def.name.value}!' or '[${def.name.value}!]!'`,
      },
    ])
  }

  return List()
}

const validateEntityFieldDirective = (defs, def, field, directive) =>
  directive.name.value === 'derivedFrom'
    ? validateDerivedFromDirective(defs, def, field, directive)
    : List()

const validateEntityFieldDirectives = (defs, def, field) =>
  field.directives.reduce(
    (errors, directive) =>
      errors.concat(validateEntityFieldDirective(defs, def, field, directive)),
    List(),
  )

const validateEntityFields = (defs, def) =>
  def.fields.reduce(
    (errors, field) =>
      errors
        .concat(validateEntityFieldType(defs, def, field))
        .concat(validateEntityFieldArguments(defs, def, field))
        .concat(validateEntityFieldDirectives(defs, def, field)),
    List(),
  )

const validateNoImportsDirective = def =>
  def.directives.find(directive => directive.name.value == 'imports')
    ? List().push(
        immutable.fromJS({
          loc: def.name.loc,
          entity: def.name.value,
          message: '@imports directive only allowed on `_SubgraphSchema_` type',
        }),
      )
    : List()

const importDirectiveTypeValidators = {
  StringValue: (_def, _directive, _type) => List(),
  ObjectValue: (def, directive, type) => {
    let errors = List()
    if (type.fields.length != 2) {
      return errors.push(
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: '@imports type objects accept and require two fields: [name, as]',
        }),
      )
    }
    return type.fields.reduce((errors, field) => {
      if (!['name', 'as'].includes(field.name.value)) {
        return errors.push(
          immutable.fromJS({
            loc: directive.name.loc,
            entity: def.name.value,
            message: `@imports type object field '${field.name.value}' invalid,  may only be one of: [name, as]`,
          }),
        )
      }
      if (field.value.kind != 'StringValue') {
        return errors.push(
          immutable.fromJS({
            loc: directive.name.loc,
            entity: def.name.value,
            message: '@imports type object fields [name, as] must be strings',
          }),
        )
      }
      return errors
    }, errors)
  },
}

const validateImportDirectiveType = (def, directive, type) =>
  importDirectiveTypeValidators[type.kind]
    ? importDirectiveTypeValidators[type.kind](def, directive, type)
    : List().push(
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: 'Imported type must be either String | {name: String, as: String}',
        }),
      )

const validateImportDirectiveArgumentTypes = (def, directive, argument) => {
  if (argument.value.kind != 'ListValue') {
    return List().push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: '@imports directive argument: types must be an list',
      }),
    )
  }

  return argument.value.values.reduce(
    (errors, type) => errors.concat(validateImportDirectiveType(def, directive, type)),
    List(),
  )
}

const validateImportDirectiveArgumentFrom = (def, directive, argument) => {
  if (argument.value.kind != 'ObjectValue') {
    return List().push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: '@imports directive argument: `from` must be an object',
      }),
    )
  }

  if (argument.value.fields.length != 1) {
    return List().push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: '@imports directive argument: `from` must have one field of [id, name]',
      }),
    )
  }

  return argument.value.fields.reduce((errors, field) => {
    if (!['name', 'id'].includes(field.name.value)) {
      return errors.push(
        immutable.fromJS({
          loc: field.name.loc,
          entity: def.name.value,
          message: '@imports directive from: only fields `id` or `name` allowed',
        }),
      )
    }
    if (field.value.kind != 'StringValue') {
      return errors.push(
        immutable.fromJS({
          loc: field.name.loc,
          entity: def.name.value,
          message: '@imports directive from: fields must have string values',
        }),
      )
    }
    return errors
  }, List())
}

const validateImportDirective = (def, directive) => {
  let errors = List()

  if (directive.name.value != 'imports') {
    return errors.push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: '_SubgraphSchema_ directives: only @import directives allowed',
      }),
    )
  }

  let types = directive.arguments.find(argument => argument.name.value == 'types')
  if (!types) {
    errors = errors.push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: `@import argument 'types' must be specified`,
      }),
    )
  } else {
    errors = errors.concat(validateImportDirectiveArgumentTypes(def, directive, types))
  }

  let from = directive.arguments.find(argument => argument.name.value == 'from')
  if (!from) {
    errors = errors.push(
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: `@import argument 'from' required: specify the subgraph to import types from`,
      }),
    )
  } else {
    errors = errors.concat(validateImportDirectiveArgumentFrom(def, directive, from))
  }

  return errors
}

const validateSubgraphSchemaDirectives = def =>
  def.directives.reduce(
    (errors, directive) => errors.concat(validateImportDirective(def, directive)),
    List(),
  )

const validateTypeHasNoFields = def => {
  let errors = List()
  if (def.fields.length) {
    return errors.push(
      immutable.fromJS({
        loc: def.name.loc,
        entity: def.name.value,
        message: `${def.name.value} type is not allowed any fields by convention`,
      }),
    )
  }
  return errors
}

const typeDefinitionValidators = {
  ObjectTypeDefinition: (defs, def) =>
    def.name && def.name.value == '_SubgraphSchema_'
      ? List.of(...validateSubgraphSchemaDirectives(def), ...validateTypeHasNoFields(def))
      : List.of(
          ...validateEntityDirective(def),
          ...validateEntityID(def),
          ...validateEntityFields(defs, def),
          ...validateNoImportsDirective(def),
        ),
  ObjectTypeExtension: (_defs, _def) => List(),
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

module.exports = { typeSuggestion, validateSchema }
