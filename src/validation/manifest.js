const immutable = require('immutable')
const yaml = require('js-yaml')
const path = require('path')

const List = immutable.List
const Map = immutable.Map

/**
 * Returns a user-friendly type name for a value.
 */
const typeName = value =>
  List.isList(value) ? 'list' : Map.isMap(value) ? 'map' : typeof value

/**
 * Converts an immutable or plain JavaScript value to a YAML string.
 */
const toYAML = x =>
  yaml
    .safeDump(typeName(x) === 'list' || typeName(x) === 'map' ? x.toJS() : x, {
      indent: 2,
    })
    .trim()

/**
 * Looks up the type of a field in a GraphQL object type.
 */
const getFieldType = (type, fieldName) => {
  let fieldDef = type
    .get('fields')
    .find(field => field.getIn(['name', 'value']) === fieldName)

  return fieldDef !== undefined ? fieldDef.get('type') : undefined
}

/**
 * Resolves a type in the GraphQL schema.
 */
const resolveType = (schema, type) =>
  type.has('type')
    ? resolveType(schema, type.get('type'))
    : type.get('kind') === 'NamedType'
    ? schema
        .get('definitions')
        .find(def => def.getIn(['name', 'value']) === type.getIn(['name', 'value']))
    : 'resolveType: unimplemented'

/**
 * A map of supported validators.
 */
const validators = immutable.fromJS({
  ScalarTypeDefinition: (value, ctx) =>
    validators.get(ctx.getIn(['type', 'name', 'value']))(value, ctx),

  UnionTypeDefinition: (value, ctx) => {
    const unionVariants = ctx
      .getIn(['type', 'types'])

    let errors = List()

    for (const variantType of unionVariants) {
      const variantErrors = validateValue(value, ctx.set('type', variantType))
      // No errors found, union variant matched, early return
      if (variantErrors.isEmpty()) {
        return List()
      }
      errors = errors.push(variantErrors)
    }

    // Return errors from variant that matched the most
    return List(errors.minBy(variantErrors => variantErrors.count()))
  },

  NamedType: (value, ctx) =>
    validateValue(
      value,
      ctx.update('type', type => resolveType(ctx.get('schema'), type)),
    ),

  NonNullType: (value, ctx) =>
    value !== null && value !== undefined
      ? validateValue(value, ctx.update('type', type => type.get('type')))
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `No value provided`,
          },
        ]),

  ListType: (value, ctx) =>
    List.isList(value)
      ? value.reduce(
          (errors, value, i) =>
            errors.concat(
              validateValue(
                value,
                ctx
                  .update('path', path => path.push(i))
                  .update('type', type => type.get('type')),
              ),
            ),
          List(),
        )
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected list, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),

  ObjectTypeDefinition: (value, ctx) => {
    return Map.isMap(value)
      ? ctx
          .getIn(['type', 'fields'])
          .map(fieldDef => fieldDef.getIn(['name', 'value']))
          .concat(value.keySeq())
          .toSet()
          .reduce(
            (errors, key) =>
              getFieldType(ctx.get('type'), key)
                ? errors.concat(
                    validateValue(
                      value.get(key),
                      ctx
                        .update('path', path => path.push(key))
                        .set('type', getFieldType(ctx.get('type'), key)),
                    ),
                  )
                : errors.push(
                    key == 'templates'
                      ? immutable.fromJS({
                          path: ctx.get('path'),
                          message:
                            `The way to declare data source templates has changed, ` +
                            `please move the templates from inside data sources to ` +
                            `a \`templates:\` field at the top level of the manifest.`,
                        })
                      : immutable.fromJS({
                          path: ctx.get('path'),
                          message: `Unexpected key in map: ${key}`,
                        }),
                  ),
            List(),
          )
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected map, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ])
  },

  String: (value, ctx) =>
    typeof value === 'string'
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected string, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),

  BigInt: (value, ctx) =>
    typeof value === 'number'
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected BigInt, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),

  File: (value, ctx) =>
    typeof value === 'string'
      ? require('fs').existsSync(ctx.get('resolveFile')(value))
        ? List()
        : immutable.fromJS([
            {
              path: ctx.get('path'),
              message: `File does not exist: ${path.relative(process.cwd(), value)}`,
            },
          ])
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected filename, found ${typeName(value)}:\n${value}`,
          },
        ]),
})

const validateValue = (value, ctx) => {
  let kind = ctx.getIn(['type', 'kind'])
  let validator = validators.get(kind)

  if (validator !== undefined) {
    // If the type is nullable, accept undefined and null; if the nullable
    // type is wrapped in a `NonNullType`, the validator for that `NonNullType`
    // will catch the missing/unset value
    if (kind !== 'NonNullType' && (value === undefined || value === null)) {
      return List()
    } else {
      return validator(value, ctx)
    }
  } else {
    return immutable.fromJS([
      {
        path: ctx.get('path'),
        message: `No validator for unsupported schema type: ${kind}`,
      },
    ])
  }
}

const validateDataSourceForNetwork = (dataSources, protocol) =>
  dataSources.filter(dataSource => protocol.isValidKindName(dataSource.kind))
    .reduce(
      (networks, dataSource) =>
        networks.update(dataSource.network, dataSources =>
          (dataSources || immutable.OrderedSet()).add(dataSource.name),
        ),
      immutable.OrderedMap(),
    )

const validateDataSourceNetworks = (value, protocol) => {
  const dataSources = [...value.dataSources, ...(value.templates || [])]

  // Networks found valid for a protocol.
  // By searching through all data sources and templates.
  const networks = validateDataSourceForNetwork(dataSources, protocol)

  if (networks.size > 1) {
    return immutable.fromJS([
      {
        path: [],
        message: `Conflicting networks used in data sources and templates:
${networks
  .map(
    (dataSources, network) =>
    `  ${
        network === undefined
          ? 'Data sources and templates having no network set'
        : `Data sources and templates using '${network}'`
        }:\n${dataSources.map(ds => `    - ${ds}`).join('\n')}`,
  )
  .join('\n')}
Recommendation: Make all data sources and templates use the same network name.`,
      },
    ])
  }

  return List()
}

const validateManifest = (value, type, schema, protocol, { resolveFile }) => {
  // Validate manifest using the GraphQL schema that defines its structure
  let errors =
    value !== null && value !== undefined
      ? validateValue(
          immutable.fromJS(value),
          immutable.fromJS({
            schema: schema,
            type: type,
            path: [],
            errors: [],
            resolveFile,
          }),
        )
      : immutable.fromJS([
          {
            path: [],
            message: `Expected non-empty value, found ${typeName(value)}:\n  ${value}`,
          },
        ])

  // Fail early because a broken manifest prevents us from performing
  // additional validation steps
  if (!errors.isEmpty()) {
    return errors
  }

  // Validate that all data sources are for the same `network` (this includes
  // _no_ network at all)
  return validateDataSourceNetworks(value, protocol)
}

const validateContractValues = (manifest, protocol, fieldName, validator, errorMessage) =>
  manifest
    .get('dataSources')
    .filter(dataSource => protocol.isValidKindName(dataSource.get('kind')))
    .reduce((errors, dataSource, dataSourceIndex) => {
      let path = ['dataSources', dataSourceIndex, 'source', fieldName]

      // No need to validate if the source has no contract field
      if (!dataSource.get('source').has(fieldName)) {
        return errors
      }

      let contractValue = dataSource.getIn(['source', fieldName])

      // Validate whether the contract is valid
      if (validator(contractValue)) {
        return errors
      } else {
        return errors.push(
          immutable.fromJS({
            path,
            message: `\
Contract ${fieldName} is invalid: ${contractValue}${errorMessage ? `\n${errorMessage}` : ''}`,
          }),
        )
      }
    }, immutable.List())

module.exports = {
  validateManifest,
  validateContractValues,
}
