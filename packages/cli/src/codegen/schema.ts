/* eslint-disable unicorn/no-array-for-each */
import type {
  DefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql/language';
import debug from '../debug';
import Schema from '../schema';
import * as typesCodegen from './types';
import * as tsCodegen from './typescript';

class IdField {
  static BYTES = Symbol('Bytes');
  static STRING = Symbol('String');

  private kind: typeof IdField.BYTES | typeof IdField.STRING;

  constructor(idField: FieldDefinitionNode | undefined) {
    if (idField?.type.kind !== 'NonNullType') {
      throw Error('id field must be non-nullable');
    }
    if (idField.type.type.kind !== 'NamedType') {
      throw Error('id field must be a named type');
    }
    const typeName = idField.type.type.name.value;
    this.kind = typeName === 'Bytes' ? IdField.BYTES : IdField.STRING;
  }

  typeName() {
    return this.kind === IdField.BYTES ? 'Bytes' : 'string';
  }

  gqlTypeName() {
    return this.kind === IdField.BYTES ? 'Bytes' : 'String';
  }

  tsNamedType() {
    return tsCodegen.namedType(this.typeName());
  }

  tsValueFrom() {
    return this.kind === IdField.BYTES ? 'Value.fromBytes(id)' : 'Value.fromString(id)';
  }

  tsValueKind() {
    return this.kind === IdField.BYTES ? 'ValueKind.BYTES' : 'ValueKind.STRING';
  }

  tsValueToString() {
    return this.kind == IdField.BYTES ? 'id.toBytes().toHexString()' : 'id.toString()';
  }

  tsToString() {
    return this.kind == IdField.BYTES ? 'id.toHexString()' : 'id';
  }

  static fromFields(fields: readonly FieldDefinitionNode[] | undefined) {
    const idField = fields?.find(field => field.name.value === 'id');
    return new IdField(idField);
  }

  static fromTypeDef(def: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) {
    return IdField.fromFields(def.fields);
  }
}

const schemaCodeGeneratorDebug = debug('graph-cli:SchemaCodeGenerator');

export default class SchemaCodeGenerator {
  constructor(private schema: Schema) {
    this.schema = schema;
  }

  generateModuleImports() {
    return [
      tsCodegen.moduleImports(
        [
          // Base classes
          'TypedMap',
          'Entity',
          'Value',
          'ValueKind',

          // APIs
          'store',

          // Basic Scalar types
          'Bytes',
          'BigInt',
          'BigDecimal',
        ],
        '@graphprotocol/graph-ts',
      ),
    ];
  }

  generateTypes(): Array<tsCodegen.Class> {
    return this.schema.ast.definitions
      .map(def => {
        if (this._isEntityTypeDefinition(def)) {
          schemaCodeGeneratorDebug.extend('generateTypes')(
            `Generating entity type for ${def.name.value}`,
          );
          return this._generateEntityType(def);
        }
      })
      .filter(Boolean) as Array<tsCodegen.Class>;
  }

  generateDerivedLoaders() {
    // This gets all the interfaces in the schema
    // We can think of more optimized ways to do this
    const interfaces = (
      this.schema.ast.definitions.filter(def =>
        this._isInterfaceDefinition(def),
      ) as InterfaceTypeDefinitionNode[]
    ).map(def => def.name.value);

    const fields = (
      (
        this.schema.ast.definitions.filter(def => {
          return this._isEntityTypeDefinition(def);
        }) as ObjectTypeDefinitionNode[]
      )
        .flatMap((def: ObjectTypeDefinitionNode) => def.fields)
        .filter(def => this._isDerivedField(def))
        .filter(def => def?.type !== undefined) as FieldDefinitionNode[]
    ).map(def => this._getTypeNameForField(def.type));
    schemaCodeGeneratorDebug.extend('generateDerivedLoaders')(
      `Generating derived loaders for ${fields}`,
    );

    return [...new Set(fields)].map(typeName => {
      // do not support interfaces
      if (!interfaces.includes(typeName)) {
        return this._generateDerivedLoader(typeName);
      }
    });
  }

  _isEntityTypeDefinition(def: DefinitionNode): def is ObjectTypeDefinitionNode {
    return (
      def.kind === 'ObjectTypeDefinition' &&
      def.directives?.find(directive => directive.name.value === 'entity') !== undefined
    );
  }

  _isDerivedField(field: FieldDefinitionNode | undefined): boolean {
    return (
      field?.directives?.find(directive => directive.name.value === 'derivedFrom') !== undefined
    );
  }
  _isInterfaceDefinition(def: DefinitionNode): def is InterfaceTypeDefinitionNode {
    return def.kind === 'InterfaceTypeDefinition';
  }

  _generateEntityType(def: ObjectTypeDefinitionNode) {
    const name = def.name.value;
    const klass = tsCodegen.klass(name, { export: true, extends: 'Entity' });
    const fields = def.fields;
    const idField = IdField.fromFields(fields);

    // Generate and add a constructor
    klass.addMethod(this._generateConstructor(name, fields));

    // Generate and add save() and getById() methods
    this._generateStoreMethods(name, idField).forEach(method => klass.addMethod(method));

    // Generate and add entity field getters and setters
    def.fields
      ?.reduce(
        (methods, field) => methods.concat(this._generateEntityFieldMethods(def, field)),
        [] as tsCodegen.Method[],
      )
      .forEach((method: any) => klass.addMethod(method));

    return klass;
  }

  _generateDerivedLoader(typeName: string): any {
    // <field>Loader
    const klass = tsCodegen.klass(`${typeName}Loader`, { export: true, extends: 'Entity' });

    klass.addMember(tsCodegen.klassMember('_entity', 'string'));
    klass.addMember(tsCodegen.klassMember('_field', 'string'));
    klass.addMember(tsCodegen.klassMember('_id', 'string'));
    // Generate and add a constructor
    klass.addMethod(
      tsCodegen.method(
        'constructor',
        [
          tsCodegen.param('entity', 'string'),
          tsCodegen.param('id', 'string'),
          tsCodegen.param('field', 'string'),
        ],
        undefined,
        `
      super();
      this._entity = entity;
      this._id = id;
      this._field = field;
`,
      ),
    );

    // Generate load() method for the Loader
    klass.addMethod(
      tsCodegen.method(
        'load',
        [],
        `${typeName}[]`,
        `
  let value = store.loadRelated(this._entity, this._id, this._field);
  return changetype<${typeName}[]>(value);
  `,
      ),
    );

    return klass;
  }

  _getTypeNameForField(gqlType: TypeNode): string {
    if (gqlType.kind === 'NonNullType') {
      return this._getTypeNameForField(gqlType.type);
    }
    if (gqlType.kind === 'ListType') {
      return this._getTypeNameForField(gqlType.type);
    }
    if (gqlType.kind === 'NamedType') {
      return (gqlType as NamedTypeNode).name.value;
    }

    throw new Error(`Unknown type kind: ${gqlType}`);
  }
  _generateConstructor(_entityName: string, fields: readonly FieldDefinitionNode[] | undefined) {
    const idField = IdField.fromFields(fields);
    return tsCodegen.method(
      'constructor',
      [tsCodegen.param('id', idField.tsNamedType())],
      undefined,
      `
      super()
      this.set('id', ${idField.tsValueFrom()})
      `,
    );
  }

  _generateStoreMethods(
    entityName: string,
    idField: IdField,
  ): Array<tsCodegen.Method | tsCodegen.StaticMethod> {
    return [
      tsCodegen.method(
        'save',
        [],
        tsCodegen.namedType('void'),
        `
        let id = this.get('id')
        assert(id != null,
               'Cannot save ${entityName} entity without an ID')
        if (id) {
          assert(id.kind == ${idField.tsValueKind()},
                 \`Entities of type ${entityName} must have an ID of type ${idField.gqlTypeName()} but the id '\${id.displayData()}' is of type \${id.displayKind()}\`)
          store.set('${entityName}', ${idField.tsValueToString()}, this)
        }`,
      ),

      tsCodegen.staticMethod(
        'loadInBlock',
        [tsCodegen.param('id', tsCodegen.namedType(idField.typeName()))],
        tsCodegen.nullableType(tsCodegen.namedType(entityName)),
        `
        return changetype<${entityName} | null>(store.get_in_block('${entityName}', ${idField.tsToString()}))
        `,
      ),

      tsCodegen.staticMethod(
        'load',
        [tsCodegen.param('id', tsCodegen.namedType(idField.typeName()))],
        tsCodegen.nullableType(tsCodegen.namedType(entityName)),
        `
        return changetype<${entityName} | null>(store.get('${entityName}', ${idField.tsToString()}))
        `,
      ),
    ];
  }

  _generateEntityFieldMethods(
    entityDef: ObjectTypeDefinitionNode,
    fieldDef: FieldDefinitionNode,
  ): Array<tsCodegen.Method> {
    return (
      [
        this._generateEntityFieldGetter(entityDef, fieldDef),
        this._generateEntityFieldSetter(entityDef, fieldDef),
      ]
        // generator can return null if the field is not supported
        // so we filter all falsy values
        .filter(Boolean) as Array<tsCodegen.Method>
    );
  }

  _generateEntityFieldGetter(_entityDef: ObjectTypeDefinitionNode, fieldDef: FieldDefinitionNode) {
    const isDerivedField = this._isDerivedField(fieldDef);
    const name = fieldDef.name.value;

    if (isDerivedField) {
      schemaCodeGeneratorDebug.extend('_generateEntityFieldGetter')(
        `Generating derived field getter for ${name}`,
      );
      return this._generateDerivedFieldGetter(_entityDef, fieldDef);
    }

    const gqlType = fieldDef.type;
    const fieldValueType = this._valueTypeFromGraphQl(gqlType);
    const returnType = this._typeFromGraphQl(gqlType);
    const isNullable = returnType instanceof tsCodegen.NullableType;
    const primitiveDefault =
      returnType instanceof tsCodegen.NamedType ? returnType.getPrimitiveDefault() : null;

    const getNonNullable = `if (!value || value.kind == ValueKind.NULL) {
                          ${
                            primitiveDefault === null
                              ? "throw new Error('Cannot return null for a required field.')"
                              : `return ${primitiveDefault}`
                          }
                        } else {
                          return ${typesCodegen.valueToAsc('value', fieldValueType)}
                        }`;
    const getNullable = `if (!value || value.kind == ValueKind.NULL) {
                          return null
                        } else {
                          return ${typesCodegen.valueToAsc('value', fieldValueType)}
                        }`;

    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
       let value = this.get('${name}')
       ${isNullable ? getNullable : getNonNullable}
      `,
    );
  }
  _generateDerivedFieldGetter(entityDef: ObjectTypeDefinitionNode, fieldDef: FieldDefinitionNode) {
    const entityName = entityDef.name.value;
    const name = fieldDef.name.value;
    schemaCodeGeneratorDebug.extend('_generateDerivedFieldGetter')(
      `Generating derived field '${name}' getter for Entity '${entityName}'`,
    );
    const gqlType = fieldDef.type;
    schemaCodeGeneratorDebug.extend('_generateDerivedFieldGetter')(
      "Derived field's type: %M",
      gqlType,
    );
    const returnType = this._returnTypeForDervied(gqlType);
    schemaCodeGeneratorDebug.extend('_generateDerivedFieldGetter')(
      "Derived field's return type: %M",
      returnType,
    );
    const obj = this.schema.ast.definitions.find(def => {
      if (def.kind === 'ObjectTypeDefinition') {
        const defobj = def as ObjectTypeDefinitionNode;
        return defobj.name.value == this._baseType(gqlType);
      }
      return false;
    }) as ObjectTypeDefinitionNode;

    if (!obj) {
      schemaCodeGeneratorDebug.extend('_generateDerivedFieldGetter')(
        "Could not find object type definition for derived field's base type: %M",
        obj,
      );
      return null;
    }

    schemaCodeGeneratorDebug.extend('_generateDerivedFieldGetter')(
      "Found object type definition for derived field's base type: %M",
      obj,
    );

    const idf = IdField.fromTypeDef(entityDef);
    const idIsBytes = idf.typeName() == 'Bytes';
    const toValueString = idIsBytes ? '.toBytes().toHexString()' : '.toString()';

    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
        return new ${returnType}('${entityName}', this.get('id')!${toValueString}, '${name}')
      `,
    );
  }

  _returnTypeForDervied(gqlType: TypeNode): tsCodegen.NamedType {
    if (gqlType.kind === 'NonNullType') {
      return this._returnTypeForDervied(gqlType.type);
    }
    if (gqlType.kind === 'ListType') {
      return this._returnTypeForDervied(gqlType.type);
    }
    const type = tsCodegen.namedType(gqlType.name.value + 'Loader');
    return type;
  }

  _generatedEntityDerivedFieldGetter(
    _entityDef: ObjectTypeDefinitionNode,
    fieldDef: FieldDefinitionNode,
  ) {
    const name = fieldDef.name.value;
    const gqlType = fieldDef.type;
    const fieldValueType = this._valueTypeFromGraphQl(gqlType);
    const returnType = this._typeFromGraphQl(gqlType);
    const isNullable = returnType instanceof tsCodegen.NullableType;

    const getNonNullable = `return ${typesCodegen.valueToAsc('value!', fieldValueType)}`;
    const getNullable = `if (!value || value.kind == ValueKind.NULL) {
                          return null
                        } else {
                          return ${typesCodegen.valueToAsc('value', fieldValueType)}
                        }`;

    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
       let value = this.get('${name}')
       ${isNullable ? getNullable : getNonNullable}
      `,
    );
  }
  _generateEntityFieldSetter(_entityDef: ObjectTypeDefinitionNode, fieldDef: FieldDefinitionNode) {
    const name = fieldDef.name.value;
    const isDerivedField = !!fieldDef.directives?.find(
      directive => directive.name.value === 'derivedFrom',
    );

    // We cannot have setters for derived fields
    if (isDerivedField) return null;

    const gqlType = fieldDef.type;
    const fieldValueType = this._valueTypeFromGraphQl(gqlType);
    const paramType = this._typeFromGraphQl(gqlType);
    const isNullable = paramType instanceof tsCodegen.NullableType;
    const paramTypeString = isNullable ? paramType.inner.toString() : paramType.toString();
    const isArray = paramType instanceof tsCodegen.ArrayType;

    if (isArray && paramType.inner instanceof tsCodegen.NullableType) {
      const baseType = this._baseType(gqlType);

      throw new Error(`
GraphQL schema can't have List's with Nullable members.
Error in '${name}' field of type '[${baseType}]'.
Suggestion: add an '!' to the member type of the List, change from '[${baseType}]' to '[${baseType}!]'`);
    }

    const setNonNullable = `
      this.set('${name}', ${typesCodegen.valueFromAsc(`value`, fieldValueType)})
    `;
    const setNullable = `
      if (!value) {
        this.unset('${name}')
      } else {
        this.set('${name}', ${typesCodegen.valueFromAsc(
          `<${paramTypeString}>value`,
          fieldValueType,
        )})
      }
    `;

    return tsCodegen.method(
      `set ${name}`,
      [tsCodegen.param('value', paramType)],
      undefined,
      isNullable ? setNullable : setNonNullable,
    );
  }

  _resolveFieldType(gqlType: NamedTypeNode) {
    const typeName = gqlType.name.value;

    // If this is a reference to another type, the field has the type of
    // the referred type's id field
    const typeDef = this.schema.ast.definitions?.find(
      def =>
        (this._isEntityTypeDefinition(def) || this._isInterfaceDefinition(def)) &&
        def.name.value === typeName,
    ) as ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | undefined;
    if (typeDef) {
      return IdField.fromTypeDef(typeDef).typeName();
    }
    return typeName as string;
  }

  /** Return the type that values for this field must have. For scalar
   * types, that's the type from the subgraph schema. For references to
   * other entity types, this is the same as the type of the id of the
   * referred type, i.e., `string` or `Bytes`*/
  _valueTypeFromGraphQl(gqlType: TypeNode): string {
    if (gqlType.kind === 'NonNullType') {
      return this._valueTypeFromGraphQl(gqlType.type);
    }
    if (gqlType.kind === 'ListType') {
      return '[' + this._valueTypeFromGraphQl(gqlType.type) + ']';
    }
    return this._resolveFieldType(gqlType);
  }

  /** Determine the base type of `gqlType` by removing any non-null
   * constraints and using the type of elements of lists */
  _baseType(gqlType: TypeNode): string {
    if (gqlType.kind === 'NonNullType') {
      return this._baseType(gqlType.type);
    }
    if (gqlType.kind === 'ListType') {
      return this._baseType(gqlType.type);
    }
    return gqlType.name.value;
  }

  _typeFromGraphQl(
    gqlType: TypeNode,
    nullable = true,
  ): tsCodegen.ArrayType | tsCodegen.NullableType | tsCodegen.NamedType {
    if (gqlType.kind === 'NonNullType') {
      return this._typeFromGraphQl(gqlType.type, false);
    }
    if (gqlType.kind === 'ListType') {
      const type = tsCodegen.arrayType(this._typeFromGraphQl(gqlType.type) as tsCodegen.NamedType);
      return nullable ? tsCodegen.nullableType(type) : type;
    }
    // NamedType
    const type = tsCodegen.namedType(
      typesCodegen.ascTypeForValue(this._resolveFieldType(gqlType)) as any,
    );
    // In AssemblyScript, primitives cannot be nullable.
    return nullable && !type.isPrimitive() ? tsCodegen.nullableType(type) : type;
  }
}
