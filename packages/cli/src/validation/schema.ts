import fs from 'fs';
import * as graphql from 'graphql/language';
import immutable from 'immutable';

const List = immutable.List;
const Set = immutable.Set;

// Builtin scalar types
const BUILTIN_SCALAR_TYPES = [
  'Boolean',
  'Int',
  'BigDecimal',
  'String',
  'BigInt',
  'Bytes',
  'ID',
  'Int8',
];

// Type suggestions for common mistakes
const TYPE_SUGGESTIONS = [
  ['Address', 'Bytes'],
  ['address', 'Bytes'],
  ['Account', 'String'],
  ['account', 'String'],
  ['AccountId', 'String'],
  ['AccountID', 'String'],
  ['accountId', 'String'],
  ['accountid', 'String'],
  ['bytes', 'Bytes'],
  ['string', 'String'],
  ['bool', 'Boolean'],
  ['boolean', 'Boolean'],
  ['Bool', 'Boolean'],
  ['float', 'BigDecimal'],
  ['Float', 'BigDecimal'],
  ['int', 'Int'],
  ['int8', 'Int8'],
  ['uint', 'BigInt'],
  ['owner', 'String'],
  ['Owner', 'String'],
  [/^(u|uint)8$/, 'Int8'],
  [/^(i|int)8$/, 'Int8'],
  [/^(u|uint)(8|16|24)$/, 'Int'],
  [/^(i|int)(8|16|24|32)$/, 'Int'],
  [/^(u|uint)32$/, 'BigInt'],
  [
    /^(u|uint|i|int)(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    'BigInt',
  ],
];

// As a convention, the type _Schema_ is reserved to define imports on.
const RESERVED_TYPE = '_Schema_';

/**
 * Returns a GraphQL type suggestion for a given input type.
 * Returns `undefined` if no suggestion is available for the type.
 */
export const typeSuggestion = (typeName: string) =>
  TYPE_SUGGESTIONS.filter(([pattern, _]) => {
    return typeof pattern === 'string' ? pattern === typeName : typeName.match(pattern);
  }).map(([_, suggestion]) => suggestion)[0];

const loadSchema = (filename: string) => {
  try {
    return fs.readFileSync(filename, 'utf-8');
  } catch (e) {
    throw new Error(`Failed to load GraphQL schema: ${e}`);
  }
};

const parseSchema = (doc: string) => {
  try {
    return graphql.parse(doc);
  } catch (e) {
    throw new Error(`Invalid GraphQL schema: ${e}`);
  }
};

const validateEntityDirective = (def: any) =>
  def.directives.find((directive: any) => directive.name.value === 'entity')
    ? List()
    : immutable.fromJS([
        {
          loc: def.loc,
          entity: def.name.value,
          message: `Defined without @entity directive`,
        },
      ]);

const validateEntityID = (def: any) => {
  const idField = def.fields.find((field: any) => field.name.value === 'id');

  if (idField === undefined) {
    return immutable.fromJS([
      {
        loc: def.loc,
        entity: def.name.value,
        message: `Missing field: id: ID!`,
      },
    ]);
  }

  if (
    idField.type.kind === 'NonNullType' &&
    idField.type.type.kind === 'NamedType' &&
    (idField.type.type.name.value === 'ID' ||
      idField.type.type.name.value === 'Bytes' ||
      idField.type.type.name.value === 'String')
  ) {
    return List();
  }
  return immutable.fromJS([
    {
      loc: idField.loc,
      entity: def.name.value,
      message: `Field 'id': Entity ids must be of type Bytes! or String!`,
    },
  ]);
};

const validateListFieldType = (def: any, field: any) =>
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
    : List();

const unwrapType = (type: any) => {
  const innerTypeFromList = (listType: any): any =>
    listType.type.kind === 'NonNullType' ? innerTypeFromNonNull(listType.type) : listType.type;

  const innerTypeFromNonNull = (nonNullType: any): any =>
    nonNullType.type.kind === 'ListType' ? innerTypeFromList(nonNullType.type) : nonNullType.type;

  // Obtain the inner-most type from the field
  return type.kind === 'NonNullType'
    ? innerTypeFromNonNull(type)
    : type.kind === 'ListType'
    ? innerTypeFromList(type)
    : type;
};

const gatherLocalTypes = (defs: readonly graphql.DefinitionNode[]) =>
  defs
    .filter(
      def =>
        def.kind === 'ObjectTypeDefinition' ||
        def.kind === 'EnumTypeDefinition' ||
        def.kind === 'InterfaceTypeDefinition',
    )
    .map(
      def =>
        // @ts-expect-error TODO: name field does not exist on definition, really?
        def.name.value,
    );

const gatherImportedTypes = (defs: readonly graphql.DefinitionNode[]) =>
  defs
    .filter(
      def =>
        def.kind === 'ObjectTypeDefinition' &&
        def.name.value == RESERVED_TYPE &&
        def.directives?.find(
          (directive: any) =>
            directive.name.value == 'import' &&
            directive.arguments.find((argument: any) => argument.name.value == 'types'),
        ),
    )
    .map(def =>
      // @ts-expect-error TODO: directives field does not exist on definition, really?
      def.directives
        .filter(
          (directive: any) =>
            directive.name.value == 'import' &&
            directive.arguments.find((argument: any) => argument.name.value == 'types'),
        )
        .map((imp: any) =>
          imp.arguments.find(
            (argument: any) => argument.name.value == 'types' && argument.value.kind == 'ListValue',
          ),
        )
        .map((arg: any) =>
          arg.value.values.map((type: any) =>
            type.kind == 'StringValue'
              ? type.value
              : type.kind == 'ObjectValue' &&
                type.fields.find(
                  (field: any) => field.name.value == 'as' && field.value.kind == 'StringValue',
                )
              ? type.fields.find((field: any) => field.name.value == 'as').value.value
              : undefined,
          ),
        ),
    )
    .reduce(
      (flattened, types_args) =>
        flattened.concat(
          types_args.reduce((flattened: any, types_arg: any[]) => {
            for (const type in types_arg) {
              if (type) flattened.push(type);
            }
            return flattened;
          }, []),
        ),
      [],
    );

const entityTypeByName = (defs: any[], name: string) =>
  defs
    .filter(
      def =>
        def.kind === 'InterfaceTypeDefinition' ||
        (def.kind === 'ObjectTypeDefinition' &&
          def.directives.find((directive: any) => directive.name.value === 'entity')),
    )
    .find(def => def.name.value === name);

const fieldTargetEntityName = (field: any) => unwrapType(field.type).name.value;

const fieldTargetEntity = (defs: any[], field: any) =>
  entityTypeByName(defs, fieldTargetEntityName(field));

const validateInnerFieldType = (defs: any[], def: any, field: any) => {
  const innerType = unwrapType(field.type);

  // Get the name of the type
  const typeName = innerType.name.value;

  // Look up a possible suggestion for the type to catch common mistakes
  const suggestion = typeSuggestion(typeName);

  // Collect all types that we can use here: built-ins + entities + enums + interfaces
  const availableTypes = List.of(
    ...BUILTIN_SCALAR_TYPES,
    ...gatherLocalTypes(defs),
    ...gatherImportedTypes(defs),
  );

  // Check whether the type name is available, otherwise return an error
  return availableTypes.includes(typeName)
    ? List()
    : immutable.fromJS([
        {
          loc: field.loc,
          entity: def.name.value,
          message: `\
Field '${field.name.value}': \
Unknown type '${typeName}'.${suggestion === undefined ? '' : ` Did you mean '${suggestion}'?`}`,
        },
      ]);
};

const validateEntityFieldType = (defs: any[], def: any, field: any) =>
  List.of(...validateListFieldType(def, field), ...validateInnerFieldType(defs, def, field));

const validateEntityFieldArguments = (_defs: any[], def: any, field: any) =>
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
    : List();

const validateDerivedFromDirective = (defs: any[], def: any, field: any, directive: any) => {
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
    ]);
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
    ]);
  }

  const targetEntity = fieldTargetEntity(defs, field);
  if (targetEntity === undefined) {
    // This is handled in `validateInnerFieldType` but if we don't catch
    // the undefined case here, the code below will throw, as it assumes
    // the target entity exists
    return immutable.fromJS([]);
  }

  const derivedFromField = targetEntity.fields.find(
    (field: any) => field.name.value === directive.arguments[0].value.value,
  );

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
    ]);
  }

  const backrefTypeName = unwrapType(derivedFromField.type);
  const backRefEntity = entityTypeByName(defs, backrefTypeName.name.value);

  // The field we are deriving from must either have type 'def' or one of the
  // interface types that 'def' is implementing
  if (
    !backRefEntity ||
    (backRefEntity.name.value !== def.name.value &&
      !def.interfaces.find((intf: any) => intf.name.value === backRefEntity.name.value))
  ) {
    return immutable.fromJS([
      {
        loc: directive.loc,
        entity: def.name.value,
        message: `\
Field '${field.name.value}': \
@derivedFrom field '${directive.arguments[0].value.value}' \
on type '${targetEntity.name.value}' must have the type \
'${def.name.value}', '${def.name.value}!', '[${def.name.value}!]!', \
or one of the interface types that '${def.name.value}' implements`,
      },
    ]);
  }

  return List();
};

const validateEntityFieldDirective = (defs: any[], def: any, field: any, directive: any) =>
  directive.name.value === 'derivedFrom'
    ? validateDerivedFromDirective(defs, def, field, directive)
    : List();

const validateEntityFieldDirectives = (defs: any[], def: any, field: any) =>
  field.directives.reduce(
    (errors: any[], directive: any) =>
      errors.concat(validateEntityFieldDirective(defs, def, field, directive)),
    List(),
  );

const validateEntityFields = (defs: any, def: any) =>
  def.fields.reduce(
    (errors: any[], field: any) =>
      errors
        .concat(validateEntityFieldType(defs, def, field))
        .concat(validateEntityFieldArguments(defs, def, field))
        .concat(validateEntityFieldDirectives(defs, def, field)),
    List(),
  );

const validateNoImportDirective = (def: any) =>
  def.directives.find((directive: any) => directive.name.value == 'import')
    ? List([
        immutable.fromJS({
          loc: def.name.loc,
          entity: def.name.value,
          message: `@import directive only allowed on '${RESERVED_TYPE}' type`,
        }),
      ])
    : List();

const validateNoFulltext = (def: any) =>
  def.directives.find((directive: any) => directive.name.value == 'fulltext')
    ? List([
        immutable.fromJS({
          loc: def.name.loc,
          entity: def.name.value,
          message: `@fulltext directive only allowed on '${RESERVED_TYPE}' type`,
        }),
      ])
    : List();

const validateFulltextFields = (def: any, directive: any) => {
  return directive.arguments.reduce((errors: any[], argument: any) => {
    return errors.concat(
      ['name', 'language', 'algorithm', 'include'].includes(argument.name.value)
        ? List([])
        : List([
            immutable.fromJS({
              loc: directive.name.loc,
              entity: def.name.value,
              directive: fulltextDirectiveName(directive),
              message: `found invalid argument: '${argument.name.value}', @fulltext directives only allow 'name', 'language', 'algorithm', and 'includes' arguments`,
            }),
          ]),
    );
  }, List([]));
};

const validateFulltextName = (def: any, directive: any) => {
  const name = directive.arguments.find((argument: any) => argument.name.value == 'name');
  return name
    ? validateFulltextArgumentName(def, directive, name)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          directive: fulltextDirectiveName(directive),
          message: `@fulltext argument 'name' must be specified`,
        }),
      ]);
};

const validateFulltextArgumentName = (def: any, directive: any, argument: any) => {
  return argument.value.kind == 'StringValue'
    ? List([])
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          directive: fulltextDirectiveName(directive),
          message: `@fulltext argument 'name' must be a string`,
        }),
      ]);
};

const fulltextDirectiveName = (directive: any) => {
  const arg = directive.arguments.find((argument: any) => argument.name.value == 'name');
  return arg ? arg.value.value : 'Other';
};

const validateFulltextLanguage = (def: any, directive: any) => {
  const language = directive.arguments.find((argument: any) => argument.name.value == 'language');
  return language
    ? validateFulltextArgumentLanguage(def, directive, language)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          directive: fulltextDirectiveName(directive),
          message: `@fulltext argument 'language' must be specified`,
        }),
      ]);
};

const validateFulltextArgumentLanguage = (def: any, directive: any, argument: any) => {
  const languages = [
    'simple',
    'da',
    'nl',
    'en',
    'fi',
    'fr',
    'de',
    'hu',
    'it',
    'no',
    'pt',
    'ro',
    'ru',
    'es',
    'sv',
    'tr',
  ];
  if (argument.value.kind != 'EnumValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext 'language' value must be one of: ${languages.join(', ')}`,
      }),
    ]);
  }
  if (!languages.includes(argument.value.value)) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext directive 'language' value must be one of: ${languages.join(', ')}`,
      }),
    ]);
  }
  return List([]);
};

const validateFulltextAlgorithm = (def: any, directive: any) => {
  const algorithm = directive.arguments.find((argument: any) => argument.name.value == 'algorithm');
  return algorithm
    ? validateFulltextArgumentAlgorithm(def, directive, algorithm)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          directive: fulltextDirectiveName(directive),
          message: `@fulltext argument 'algorithm' must be specified`,
        }),
      ]);
};

const validateFulltextArgumentAlgorithm = (def: any, directive: any, argument: any) => {
  if (argument.value.kind != 'EnumValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'algorithm' must be one of: rank, proximityRank`,
      }),
    ]);
  }
  if (!['rank', 'proximityRank'].includes(argument.value.value)) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext 'algorithm' value, '${argument.value.value}', must be one of: rank, proximityRank`,
      }),
    ]);
  }
  return List([]);
};

const validateFulltextInclude = (def: any, directive: any) => {
  const include = directive.arguments.find((argument: any) => argument.name.value == 'include');
  if (include) {
    if (include.value.kind != 'ListValue') {
      return List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          directive: fulltextDirectiveName(directive),
          message: `@fulltext argument 'include' must be a list`,
        }),
      ]);
    }
    return include.value.values.reduce(
      (errors: any, type: any) =>
        errors.concat(validateFulltextArgumentInclude(def, directive, type)),
      List(),
    );
  }
  return List([
    immutable.fromJS({
      loc: directive.name.loc,
      entity: def.name.value,
      directive: fulltextDirectiveName(directive),
      message: `@fulltext argument 'include' must be specified`,
    }),
  ]);
};

const validateFulltextArgumentInclude = (def: any, directive: any, argument: any) => {
  if (argument.kind != 'ObjectValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include' must have the form '[{entity: "entityName", fields: [{name: "fieldName"}, ...]} ...]`,
      }),
    ]);
  }
  if (argument.fields.length != 2) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument include must have two fields, 'entity' and 'fields'`,
      }),
    ]);
  }
  return argument.fields.reduce(
    (errors: any[], field: any) =>
      errors.concat(validateFulltextArgumentIncludeFields(def, directive, field)),
    List([]),
  );
};

const validateFulltextArgumentIncludeFields = (def: any, directive: any, field: any) => {
  if (!['entity', 'fields'].includes(field.name.value)) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > ${field.name.value}' must be be one of: entity, fields`,
      }),
    ]);
  }
  if (field.name.value == 'entity' && field.value.kind != 'StringValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > entity' must be the name of an entity in the schema enclosed in double quotes`,
      }),
    ]);
  }
  if (field.name.value == 'fields' && field.value.kind != 'ListValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > fields' must be a list`,
      }),
    ]);
  }
  if (field.name.value == 'fields' && field.value.kind == 'ListValue') {
    return field.value.values.reduce(
      (errors: any[], field: any) =>
        errors.concat(validateFulltextArgumentIncludeFieldsObjects(def, directive, field)),
      List([]),
    );
  }
  return List([]);
};

const validateFulltextArgumentIncludeFieldsObjects = (def: any, directive: any, argument: any) => {
  if (argument.kind != 'ObjectValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > fields' must have the form '[{ name: "fieldName" }, ...]`,
      }),
    ]);
  }
  return argument.fields.reduce(
    (errors: any[], field: any) =>
      errors.concat(validateFulltextArgumentIncludeArgumentFieldsObject(def, directive, field)),
    List(),
  );
};

const validateFulltextArgumentIncludeArgumentFieldsObject = (
  def: any,
  directive: any,
  field: any,
) => {
  if (!['name'].includes(field.name.value)) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > fields' has invalid member '${field.name.value}', must be one of: name`,
      }),
    ]);
  }
  if (field.name.value == 'name' && field.value.kind != 'StringValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        directive: fulltextDirectiveName(directive),
        message: `@fulltext argument 'include > fields > name' must be the name of an entity field enclosed in double quotes`,
      }),
    ]);
  }
  return List([]);
};

const importDirectiveTypeValidators = {
  StringValue: (_def: any, _directive: any, _type: any) => List(),
  ObjectValue: (def: any, directive: any, type: any) => {
    const errors = List();
    if (type.fields.length != 2) {
      return errors.push(
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: `Import must be one of "Name" or { name: "Name", as: "Alias" }`,
        }),
      );
    }
    return type.fields.reduce((errors: any[], field: any) => {
      if (!['name', 'as'].includes(field.name.value)) {
        return errors.push(
          immutable.fromJS({
            loc: directive.name.loc,
            entity: def.name.value,
            message: `@import field '${field.name.value}' invalid, may only be one of: name, as`,
          }),
        );
      }
      if (field.value.kind != 'StringValue') {
        return errors.push(
          immutable.fromJS({
            loc: directive.name.loc,
            entity: def.name.value,
            message: `@import fields [name, as] must be strings`,
          }),
        );
      }
      return errors;
    }, errors);
  },
};

const validateImportDirectiveType = (
  def: any,
  directive: any,
  type: { kind: keyof typeof importDirectiveTypeValidators },
) => {
  return importDirectiveTypeValidators[type.kind]
    ? importDirectiveTypeValidators[type.kind](def, directive, type)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: `Import must be one of "Name" or { name: "Name", as: "Alias" }`,
        }),
      ]);
};

const validateImportDirectiveArgumentTypes = (def: any, directive: any, argument: any) => {
  if (argument.value.kind != 'ListValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: `@import argument 'types' must be an list`,
      }),
    ]);
  }

  return argument.value.values.reduce(
    (errors: any[], type: any) => errors.concat(validateImportDirectiveType(def, directive, type)),
    List(),
  );
};

const validateImportDirectiveArgumentFrom = (def: any, directive: any, argument: any) => {
  if (argument.value.kind != 'ObjectValue') {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: `@import argument 'from' must be an object`,
      }),
    ]);
  }

  if (argument.value.fields.length != 1) {
    return List([
      immutable.fromJS({
        loc: directive.name.loc,
        entity: def.name.value,
        message: `@import argument 'from' must have an 'id' or 'name' field`,
      }),
    ]);
  }

  return argument.value.fields.reduce((errors: any[], field: any) => {
    if (!['name', 'id'].includes(field.name.value)) {
      return errors.push(
        immutable.fromJS({
          loc: field.name.loc,
          entity: def.name.value,
          message: `@import argument 'from' must be one of { name: "Name" } or { id: "ID" }`,
        }),
      );
    }
    if (field.value.kind != 'StringValue') {
      return errors.push(
        immutable.fromJS({
          loc: field.name.loc,
          entity: def.name.value,
          message: `@import argument 'from' must be one of { name: "Name" } or { id: "ID" } with string values`,
        }),
      );
    }
    return errors;
  }, List());
};

const validateImportDirectiveFields = (def: any, directive: any) => {
  return directive.arguments.reduce((errors: any[], argument: any) => {
    return errors.concat(
      ['types', 'from'].includes(argument.name.value)
        ? List([])
        : List([
            immutable.fromJS({
              loc: directive.name.loc,
              entity: def.name.value,
              message: `found invalid argument: '${argument.name.value}', @import directives only allow 'types' and 'from' arguments`,
            }),
          ]),
    );
  }, List([]));
};

const validateImportDirectiveTypes = (def: any, directive: any) => {
  const types = directive.arguments.find((argument: any) => argument.name.value == 'types');
  return types
    ? validateImportDirectiveArgumentTypes(def, directive, types)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: `@import argument 'types' must be specified`,
        }),
      ]);
};

const validateImportDirectiveFrom = (def: any, directive: any) => {
  const from = directive.arguments.find((argument: any) => argument.name.value == 'from');
  return from
    ? validateImportDirectiveArgumentFrom(def, directive, from)
    : List([
        immutable.fromJS({
          loc: directive.name.loc,
          entity: def.name.value,
          message: `@import argument 'from' must be specified`,
        }),
      ]);
};

const validateImportDirective = (def: any, directive: any) =>
  List.of(
    ...validateImportDirectiveFields(def, directive),
    ...validateImportDirectiveTypes(def, directive),
    ...validateImportDirectiveFrom(def, directive),
  );

const validateFulltext = (def: any, directive: any) =>
  List.of(
    ...validateFulltextFields(def, directive),
    ...validateFulltextName(def, directive),
    ...validateFulltextLanguage(def, directive),
    ...validateFulltextAlgorithm(def, directive),
    ...validateFulltextInclude(def, directive),
  );

const validateSubgraphSchemaDirective = (def: any, directive: any) => {
  if (directive.name.value == 'import') {
    return validateImportDirective(def, directive);
  }
  if (directive.name.value == 'fulltext') {
    return validateFulltext(def, directive);
  }
  return List([
    immutable.fromJS({
      loc: directive.name.loc,
      entity: def.name.value,
      message: `${RESERVED_TYPE} type only allows @import and @fulltext directives`,
    }),
  ]);
};

const validateSubgraphSchemaDirectives = (def: any) =>
  def.directives.reduce(
    (errors: any[], directive: any) =>
      errors.concat(validateSubgraphSchemaDirective(def, directive)),
    List(),
  );

const validateTypeHasNoFields = (def: any) =>
  def.fields.length
    ? List([
        immutable.fromJS({
          loc: def.name.loc,
          entity: def.name.value,
          message: `${def.name.value} type is not allowed any fields by convention`,
        }),
      ])
    : List();

const validateAtLeastOneExtensionField = (_def: any) => List();

const typeDefinitionValidators = {
  ObjectTypeDefinition: (defs: any[], def: any) =>
    def.name && def.name.value == RESERVED_TYPE
      ? List.of(...validateSubgraphSchemaDirectives(def), ...validateTypeHasNoFields(def))
      : List.of(
          ...validateEntityDirective(def),
          ...validateEntityID(def),
          ...validateEntityFields(defs, def),
          ...validateNoImportDirective(def),
          ...validateNoFulltext(def),
        ),
  ObjectTypeExtension: (_defs: any[], def: any) => validateAtLeastOneExtensionField(def),
};

const validateTypeDefinition = (defs: any, def: { kind: keyof typeof typeDefinitionValidators }) =>
  typeDefinitionValidators[def.kind] === undefined
    ? List()
    : typeDefinitionValidators[def.kind](defs, def);

const validateTypeDefinitions = (defs: any) =>
  defs.reduce(
    (errors: any[], def: any) => errors.concat(validateTypeDefinition(defs, def)),
    List(),
  );

const validateNamingCollisionsInTypes = (types: any) => {
  let seen = Set();
  let conflicting = Set();
  return types.reduce((errors: immutable.List<any>, type: any) => {
    if (seen.has(type) && !conflicting.has(type)) {
      errors = errors.push(
        immutable.fromJS({
          loc: { start: 1, end: 1 },
          entity: type,
          message: `Type '${type}' is defined more than once`,
        }),
      );
      conflicting = conflicting.add(type);
    } else {
      seen = seen.add(type);
    }
    return errors;
  }, List());
};

const validateNamingCollisions = (local: any[], imported: any) =>
  validateNamingCollisionsInTypes(local.concat(imported));

export const validateSchema = (filename: string) => {
  const doc = loadSchema(filename);
  const schema = parseSchema(doc);
  return List.of(
    ...validateTypeDefinitions(schema.definitions),
    ...validateNamingCollisions(
      gatherLocalTypes(schema.definitions),
      gatherImportedTypes(schema.definitions),
    ),
  );
};
