const immutable = require('immutable')
const yaml = require('js-yaml')

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
    .replace(/\n/g, '\n  ')
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

  UnionTypeDefinition: (value, ctx) =>
    ctx
      .getIn(['type', 'types'])
      .reduce(
        (errors, type) => errors.concat(validateValue(value, ctx.set('type', type))),
        immutable.fromJS([])
      ),

  NamedType: (value, ctx) =>
    validateValue(
      value,
      ctx.update('type', type => resolveType(ctx.get('schema'), type))
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
                  .update('type', type => type.get('type'))
              )
            ),
          immutable.fromJS([])
        )
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected list, found ${typeName(value)}:\n  ${toYAML(value)}`,
          },
        ]),

  ObjectTypeDefinition: (value, ctx) => {
    return Map.isMap(value)
      ? ctx
          .getIn(['type', 'fields'])
          .map(fieldDef => fieldDef.getIn(['name', 'value']))
          .concat(value.keySeq())
          .toSet()
          .reduce((errors, key) => {
            return getFieldType(ctx.get('type'), key)
              ? errors.concat(
                  validateValue(
                    value.get(key),
                    ctx
                      .update('path', path => path.push(key))
                      .set('type', getFieldType(ctx.get('type'), key))
                  )
                )
              : errors.push(
                  immutable.fromJS({
                    path: ctx.get('path'),
                    message: `Unexpected key in map: ${key}`,
                  })
                )
          }, immutable.fromJS([]))
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected map, found ${typeName(value)}:\n  ${toYAML(value)}`,
          },
        ])
  },

  String: (value, ctx) =>
    typeof value === 'string'
      ? immutable.fromJS([])
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected string, found ${typeName(value)}:\n  ${toYAML(value)}`,
          },
        ]),

  File: (value, ctx) =>
    typeof value === 'string'
      ? require('fs').existsSync(value)
        ? immutable.fromJS([])
        : immutable.fromJS([
            {
              path: ctx.get('path'),
              message: `File does not exist: ${value}`,
            },
          ])
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected filename, found ${typeName(value)}:\n  ${value}`,
          },
        ]),
})

const validateValue = (value, ctx) => {
  let kind = ctx.getIn(['type', 'kind'])
  let validator = validators.get(kind)

  if (validator !== undefined) {
    return validator(value, ctx)
  } else {
    return immutable.fromJS([
      {
        path: ctx.get('path'),
        message: `No validator for unsupported schema type: ${kind}`,
      },
    ])
  }
}

const validateManifest = (value, type, schema) =>
  value !== null && value !== undefined
    ? validateValue(
        immutable.fromJS(value),
        immutable.fromJS({
          schema: schema,
          type: type,
          path: [],
          errors: [],
        })
      ).toJS()
    : [
        {
          path: [],
          message: `Expected non-empty value, found ${typeName(value)}:\n  ${value}`,
        },
      ]

module.exports = {
  validateManifest,
}
