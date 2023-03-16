import immutable from 'immutable';
import Schema from '../schema';
import * as typesCodegen from './types';
import * as tsCodegen from './typescript';

class IdField {
  static BYTES = Symbol('Bytes');
  static STRING = Symbol('String');

  private kind: typeof IdField.BYTES | typeof IdField.STRING;

  constructor(idField: immutable.Map<any, any>) {
    const typeName = idField.getIn(['type', 'type', 'name', 'value']);
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

  static fromFields(fields: immutable.List<any>) {
    const idField = fields.find(field => field.getIn(['name', 'value']) === 'id');
    return new IdField(idField);
  }

  static fromTypeDef(def: immutable.Map<any, any>) {
    return IdField.fromFields(def.get('fields'));
  }
}

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

  generateTypes() {
    return this.schema.ast
      .get('definitions')
      .filter((def: any) => this._isEntityTypeDefinition(def))
      .map((def: any) => this._generateEntityType(def));
  }

  generateDerivedLoaders() {
    const fields = this.schema.ast.get('definitions')
      .filter((def: any) => this._isEntityTypeDefinition(def))
      .map((def: any) => def.get('fields'))
      .flatten(1)
      .filter((def: any) => this._isDerivedField(def))
      .map((def: any) => this._getTypeNameForField(def));

    return [...new Set(fields)].map((typeName: any) => this._generateDerivedLoader(typeName));
  }
  _isEntityTypeDefinition(def: immutable.Map<any, any>) {
    return (
      def.get('kind') === 'ObjectTypeDefinition' &&
      def
        .get('directives')
        .find((directive: any) => directive.getIn(['name', 'value']) === 'entity') !== undefined
    );
  }

  _isDerivedField(field: any): boolean {
    return field.get('directives')
      .find((directive: any) => directive.getIn(['name', 'value']) === 'derivedFrom') !== undefined;
  }
  _isInterfaceDefinition(def: immutable.Map<any, any>) {
    return def.get('kind') === 'InterfaceTypeDefinition';
  }

  _generateEntityType(def: immutable.Map<any, any>) {
    const name = def.getIn(['name', 'value']) as string;
    const klass = tsCodegen.klass(name, { export: true, extends: 'Entity' });
    const fields = def.get('fields');
    const idField = IdField.fromFields(fields);

    // Generate and add a constructor
    klass.addMethod(this._generateConstructor(name, fields));

    // Generate and add save() and getById() methods
    this._generateStoreMethods(name, idField).forEach(method => klass.addMethod(method));

    // Generate and add entity field getters and setters
    def
      .get('fields')
      .reduce(
        (methods: any, field: any) => methods.concat(this._generateEntityFieldMethods(def, field)),
        immutable.List(),
      )
      .forEach((method: any) => klass.addMethod(method));

    return klass;
  }

  _generateDerivedLoader(typeName: string): any {
    // <field>Loader
    const klass = tsCodegen.klass(`${typeName}Loader`, { export: true, extends: 'Entity' });

    klass.addMember(tsCodegen.klassMember("_entity", "string"))
    klass.addMember(tsCodegen.klassMember("_field", "string"))
    klass.addMember(tsCodegen.klassMember("_id", "string"))
    // Generate and add a constructor
    klass.addMethod(tsCodegen.method('constructor', [tsCodegen.param('entity', 'string'), tsCodegen.param('id', 'string'), tsCodegen.param('field', 'string')], undefined, `
      super();
      this._entity = entity;
      this._id = id;
      this._field = field;
`));

    // Generate load() method for the Loader
    klass.addMethod(tsCodegen.method('load', [], `${typeName}[]`, `
  let value = store.loadRelated(this._entity, this._id, this._field);
  return changetype<${typeName}[]>(value);
  `))

    return klass;
  }
  _getTypeNameForField(gqlType: any): any {
    if (gqlType.get('kind') === 'NonNullType') {
      return this._getTypeNameForField(gqlType.get('type'))
    } else if (gqlType.get('kind') === 'ListType') {
      return this._getTypeNameForField(gqlType.get('type'))
    } else {
      return gqlType.getIn(['name', 'value'])
    }
  }

  _generateConstructor(_entityName: string, fields: immutable.List<any>) {
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

  _generateStoreMethods(entityName: any, idField: any) {
    return immutable.List.of<tsCodegen.Method | tsCodegen.StaticMethod>(
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
        'load',
        [tsCodegen.param('id', tsCodegen.namedType(idField.typeName()))],
        tsCodegen.nullableType(tsCodegen.namedType(entityName)),
        `
        return changetype<${entityName} | null>(store.get('${entityName}', ${idField.tsToString()}))
        `,
      ),
    );
  }

  _generateEntityFieldMethods(entityDef: any, fieldDef: immutable.Map<any, any>) {
    return immutable.List([
      this._generateEntityFieldGetter(entityDef, fieldDef),
      this._generateEntityFieldSetter(entityDef, fieldDef),
    ]);
  }

  _generateEntityFieldGetter(entityDef: any, fieldDef: immutable.Map<any, any>) {
    if (this._isDerivedField(fieldDef)) {
      return this._generateDerivedFieldGetter(entityDef, fieldDef);
    }
    const name = fieldDef.getIn(['name', 'value']);
    const gqlType = fieldDef.get('type');
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
  _generateDerivedFieldGetter(entityDef: any, fieldDef: immutable.Map<any, any>) {
    let entityName = entityDef.getIn(['name', 'value']);
    let name = fieldDef.getIn(['name', 'value']);
    let gqlType = fieldDef.get('type');
    let returnType = this._returnTypeForDervied(gqlType)
    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
        return new ${returnType}('${entityName}', this.get('id')!.toString(), '${name}')
      `,
    )
  }

  _returnTypeForDervied(gqlType: any): any {
    if (gqlType.get('kind') === 'NonNullType') {
      return this._returnTypeForDervied(gqlType.get('type'))
    } else if (gqlType.get('kind') === 'ListType') {
      return this._returnTypeForDervied(gqlType.get('type'))
    } else {

      const type = tsCodegen.namedType(
        gqlType.getIn(['name', 'value']) + 'Loader'
      );
      return type;
    }
  }

  _generatedEntityDerivedFieldGetter(_entityDef: any, fieldDef: immutable.Map<any, any>) {
    const name = fieldDef.getIn(['name', 'value']);
    const gqlType = fieldDef.get('type');
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
  _generateEntityFieldSetter(_entityDef: any, fieldDef: immutable.Map<any, any>) {
    // We shouldn't have setters for derived fields
    // if (this._isDerivedField(fieldDef)) {
    //   return;
    // }
    const name = fieldDef.getIn(['name', 'value']);
    const gqlType = fieldDef.get('type');
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

  _resolveFieldType(gqlType: immutable.Map<any, any>) {
    const typeName = gqlType.getIn(['name', 'value']);

    // If this is a reference to another type, the field has the type of
    // the referred type's id field
    const typeDef = this.schema.ast
      .get('definitions')
      .find(
        (def: any) =>
          (this._isEntityTypeDefinition(def) || this._isInterfaceDefinition(def)) &&
          def.getIn(['name', 'value']) === typeName,
      );
    if (typeDef) {
      return IdField.fromTypeDef(typeDef).typeName();
    }
    return typeName as string;
  }

  /** Return the type that values for this field must have. For scalar
   * types, that's the type from the subgraph schema. For references to
   * other entity types, this is the same as the type of the id of the
   * referred type, i.e., `string` or `Bytes`*/
  _valueTypeFromGraphQl(gqlType: immutable.Map<any, any>): any {
    if (gqlType.get('kind') === 'NonNullType') {
      return this._valueTypeFromGraphQl(gqlType.get('type'));
    }
    if (gqlType.get('kind') === 'ListType') {
      return '[' + this._valueTypeFromGraphQl(gqlType.get('type')) + ']';
    }
    return this._resolveFieldType(gqlType);
  }

  /** Determine the base type of `gqlType` by removing any non-null
   * constraints and using the type of elements of lists */
  _baseType(gqlType: immutable.Map<any, any>): any {
    if (gqlType.get('kind') === 'NonNullType') {
      return this._baseType(gqlType.get('type'));
    }
    if (gqlType.get('kind') === 'ListType') {
      return this._baseType(gqlType.get('type'));
    }
    return gqlType.getIn(['name', 'value']);
  }

  _typeFromGraphQl(gqlType: immutable.Map<any, any>, nullable = true): any {
    if (gqlType.get('kind') === 'NonNullType') {
      return this._typeFromGraphQl(gqlType.get('type'), false);
    }
    if (gqlType.get('kind') === 'ListType') {
      const type = tsCodegen.arrayType(this._typeFromGraphQl(gqlType.get('type')));
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

