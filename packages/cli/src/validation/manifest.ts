import fs from 'fs';
import path from 'path';
import immutable from 'immutable';
import yaml from 'js-yaml';
import Protocol from '../protocols';

const List = immutable.List;
const Map = immutable.Map;

/**
 * Returns a user-friendly type name for a value.
 */
const typeName = (value: immutable.Collection<unknown, unknown>) =>
  List.isList(value) ? 'list' : Map.isMap(value) ? 'map' : typeof value;

/**
 * Converts an immutable or plain JavaScript value to a YAML string.
 */
const toYAML = (x: immutable.Collection<unknown, unknown>) =>
  yaml
    .safeDump(typeName(x) === 'list' || typeName(x) === 'map' ? x.toJS() : x, {
      indent: 2,
    })
    .trim();

/**
 * Looks up the type of a field in a GraphQL object type.
 */
const getFieldType = (type: immutable.Map<any, any>, fieldName: string) => {
  const fieldDef = type
    .get('fields')
    .find((field: any) => field.getIn(['name', 'value']) === fieldName);

  if (fieldDef) {
    return fieldDef.get('type');
  }
};

/**
 * Resolves a type in the GraphQL schema.
 */
const resolveType = (schema: immutable.Map<any, any>, type: immutable.Map<any, any>): any =>
  type.has('type')
    ? resolveType(schema, type.get('type'))
    : type.get('kind') === 'NamedType'
    ? schema
        .get('definitions')
        .find((def: any) => def.getIn(['name', 'value']) === type.getIn(['name', 'value']))
    : 'resolveType: unimplemented';

/**
 * A map of supported validators.
 */
const validators = immutable.fromJS({
  ScalarTypeDefinition: (value: any, ctx: immutable.Map<any, any>) =>
    (validators.get(ctx.getIn(['type', 'name', 'value'])) as any)(value, ctx),

  UnionTypeDefinition: (value: any, ctx: immutable.Map<any, any>) => {
    const unionVariants = ctx.getIn(['type', 'types']) as any[];

    let errors = List();

    for (const variantType of unionVariants) {
      const variantErrors = validateValue(value, ctx.set('type', variantType));
      // No errors found, union variant matched, early return
      if (variantErrors.isEmpty()) {
        return List();
      }
      errors = errors.push(variantErrors);
    }

    // Return errors from variant that matched the most
    return List(errors.minBy((variantErrors: any) => variantErrors.count()) as any);
  },

  NamedType: (value: any, ctx: immutable.Map<any, any>) =>
    validateValue(
      value,
      ctx.update('type', type => resolveType(ctx.get('schema'), type)),
    ),

  NonNullType: (value: any, ctx: immutable.Map<any, any>) =>
    value !== null && value !== undefined
      ? validateValue(
          value,
          ctx.update('type', type => type.get('type')),
        )
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `No value provided`,
          },
        ]),

  ListType: (value: any, ctx: immutable.Map<any, any>) =>
    List.isList(value)
      ? value.reduce(
          (errors, value, i) =>
            errors.concat(
              validateValue(
                value,
                ctx.update('path', path => path.push(i)).update('type', type => type.get('type')),
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

  ObjectTypeDefinition: (value: any, ctx: any) => {
    return Map.isMap(value)
      ? ctx
          .getIn(['type', 'fields'])
          .map((fieldDef: any) => fieldDef.getIn(['name', 'value']))
          .concat(value.keySeq())
          .toSet()
          .reduce(
            (errors: any[], key: string) =>
              getFieldType(ctx.get('type'), key)
                ? errors.concat(
                    validateValue(
                      value.get(key),
                      ctx
                        .update('path', (path: string[]) => path.push(key))
                        .set('type', getFieldType(ctx.get('type'), key)),
                    ),
                  )
                : errors.push(
                    key == 'templates' && ctx.get('protocol').hasTemplates()
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
        ]);
  },

  EnumTypeDefinition: (value: any, ctx: immutable.Map<any, any>) => {
    const enumValues = (ctx.getIn(['type', 'values']) as any).map((v: any) => {
      return v.getIn(['name', 'value']);
    });

    const allowedValues = enumValues.toArray().join(', ');

    return enumValues.includes(value)
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Unexpected enum value: ${value}, allowed values: ${allowedValues}`,
          },
        ]);
  },

  String: (value: any, ctx: immutable.Map<any, any>) =>
    typeof value === 'string'
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected string, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),

  BigInt: (value: any, ctx: immutable.Map<any, any>) =>
    typeof value === 'number'
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected BigInt, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),

  File: (value: any, ctx: immutable.Map<any, any>) =>
    typeof value === 'string'
      ? fs.existsSync(ctx.get('resolveFile')(value))
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

  JSON: (value: any, ctx: immutable.Map<any, any>) => {
    try {
      JSON.parse(JSON.stringify(value));
      return List();
    } catch (e) {
      return immutable.fromJS([
        {
          path: ctx.get('path'),
          message: `Invalid JSON value: ${e.message}`,
        },
      ]);
    }
  },

  Boolean: (value: any, ctx: immutable.Map<any, any>) =>
    typeof value === 'boolean'
      ? List()
      : immutable.fromJS([
          {
            path: ctx.get('path'),
            message: `Expected true or false, found ${typeName(value)}:\n${toYAML(value)}`,
          },
        ]),
});

const validateValue = (value: any, ctx: immutable.Collection<any, any>) => {
  const kind = ctx.getIn(['type', 'kind']);
  const validator = validators.get(kind) as any;

  if (validator !== undefined) {
    // If the type is nullable, accept undefined and null; if the nullable
    // type is wrapped in a `NonNullType`, the validator for that `NonNullType`
    // will catch the missing/unset value
    if (kind !== 'NonNullType' && (value === undefined || value === null)) {
      return List();
    }
    return validator(value, ctx);
  }
  return immutable.fromJS([
    {
      path: ctx.get('path'),
      message: `No validator for unsupported schema type: ${kind}`,
    },
  ]);
};

// Transforms list of data sources like this:
// [
//   { name: 'contract0', kind: 'ethereum/contract', network: 'mainnet' },
//   { name: 'contract1', kind: 'ethereum', network: 'mainnet' },
//   { name: 'contract2', kind: 'ethereum/contract', network: 'gnosis' },
//   { name: 'contract3', kind: 'near', network: 'near-mainnet' },
// ]
//
// Into Immutable JS structure like this (protocol kind is normalized):
// {
//   ethereum: {
//     mainnet: ['contract0', 'contract1'],
//     gnosis: ['contract2'],
//   },
//   near: {
//     'near-mainnet': ['contract3'],
//   },
// }
const dataSourceListToMap = (dataSources: any[]) =>
  dataSources.reduce(
    (protocolKinds, dataSource) =>
      protocolKinds.update(Protocol.normalizeName(dataSource.kind), (networks: any) =>
        (networks || immutable.OrderedMap()).update(dataSource.network, (dataSourceNames: any) =>
          (dataSourceNames || immutable.OrderedSet()).add(dataSource.name),
        ),
      ),
    immutable.OrderedMap(),
  );

const validateDataSourceProtocolAndNetworks = (value: any) => {
  const dataSources = [...value.dataSources, ...(value.templates || [])];

  const protocolNetworkMap = dataSourceListToMap(dataSources);

  if (protocolNetworkMap.size > 1) {
    return immutable.fromJS([
      {
        path: [],
        message: `Conflicting protocol kinds used in data sources and templates:
${protocolNetworkMap
  .map(
    (dataSourceNames: any, protocolKind: string | undefined) =>
      `  ${
        protocolKind === undefined
          ? 'Data sources and templates having no protocol kind set'
          : `Data sources and templates using '${protocolKind}'`
      }:\n${dataSourceNames
        .valueSeq()
        .flatten()
        .map((ds: string) => `    - ${ds}`)
        .join('\n')}`,
  )
  .join('\n')}
Recommendation: Make all data sources and templates use the same protocol kind.`,
      },
    ]);
  }

  const networks = protocolNetworkMap.first();

  if (networks.size > 1) {
    return immutable.fromJS([
      {
        path: [],
        message: `Conflicting networks used in data sources and templates:
${networks
  .map(
    (dataSources: any, network: string | undefined) =>
      `  ${
        network === undefined
          ? 'Data sources and templates having no network set'
          : `Data sources and templates using '${network}'`
      }:\n${dataSources.map((ds: string) => `    - ${ds}`).join('\n')}`,
  )
  .join('\n')}
Recommendation: Make all data sources and templates use the same network name.`,
      },
    ]);
  }

  return List();
};

export const validateManifest = (
  value: any,
  type: any,
  schema: any,
  protocol: Protocol,
  { resolveFile }: { resolveFile: (path: string) => string },
) => {
  // Validate manifest using the GraphQL schema that defines its structure
  const errors =
    value !== null && value !== undefined
      ? validateValue(
          immutable.fromJS(value),
          immutable.fromJS({
            schema,
            type,
            path: [],
            errors: [],
            resolveFile,
            protocol,
          }),
        )
      : immutable.fromJS([
          {
            path: [],
            message: `Expected non-empty value, found ${typeName(value)}:\n  ${value}`,
          },
        ]);

  // Fail early because a broken manifest prevents us from performing
  // additional validation steps
  if (!errors.isEmpty()) {
    return errors;
  }

  // Validate that all data sources are for the same `network` and `protocol` (kind)
  // (this includes _no_ network/protocol at all)
  return validateDataSourceProtocolAndNetworks(value);
};
