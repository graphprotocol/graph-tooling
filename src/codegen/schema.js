const immutable = require('immutable')

const tsCodegen = require('./typescript')
const typesCodegen = require('./types')

module.exports = class SchemaCodeGenerator {
  constructor(schema) {
    this.schema = schema
  }

  generateModuleImports() {
    return [
      tsCodegen.moduleImports(
        [
          // Base classes
          'TypedMap',
          'Entity',
          'Value',

          // Basic Ethereum types
          'Address',
          'Bytes',
          'BigInt',
        ],
        '@graphprotocol/graph-ts'
      ),
    ]
  }

  generateTypes() {
    return this.schema.ast
      .get('definitions')
      .filter(def => this._isEntityTypeDefinition(def))
      .map(def => this._generateEntityType(def))
  }

  _isEntityTypeDefinition(def) {
    return (
      def.get('kind') === 'ObjectTypeDefinition' &&
      def
        .get('directives')
        .find(directive => directive.getIn(['name', 'value']) === 'entity') !== undefined
    )
  }

  _generateEntityType(def) {
    let name = def.getIn(['name', 'value'])
    let klass = tsCodegen.klass(name, { export: true, extends: 'Entity' })

    def
      .get('fields')
      .reduce(
        (methods, field) => methods.concat(this._generateEntityFieldMethods(def, field)),
        immutable.List()
      )
      .map(method => klass.addMethod(method))

    return klass
  }

  _generateEntityFieldMethods(entityDef, fieldDef) {
    return immutable.List([
      this._generateEntityFieldGetter(entityDef, fieldDef),
      this._generateEntityFieldSetter(entityDef, fieldDef),
    ])
  }

  _generateEntityFieldGetter(entityDef, fieldDef) {
    let name = fieldDef.getIn(['name', 'value'])
    let gqlType = fieldDef.get('type')
    let fieldValueType = this._valueTypeFromGraphQl(gqlType)
    let returnType = this._typeFromGraphQl(gqlType)
    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
      let value = this.get('${name}')
      if (value === null) {
        return ${
          returnType.toString() === 'boolean'
            ? 'false'
            : returnType.toString() === 'boolean | null'
              ? 'false'
              : 'null'
        }
      } else {
        return ${typesCodegen.valueToAsc(
          'value',
          fieldValueType
        )} as ${returnType.toString()}
      }
      `
    )
  }

  _generateEntityFieldSetter(entityDef, fieldDef) {
    let name = fieldDef.getIn(['name', 'value'])
    let gqlType = fieldDef.get('type')
    let fieldValueType = this._valueTypeFromGraphQl(gqlType)
    let paramType = this._typeFromGraphQl(gqlType)
    return tsCodegen.method(
      `set ${name}`,
      [tsCodegen.param('value', paramType)],
      undefined,
      `
        if (value === null) {
          this.unset('${name}')
        } else {
          this.set('${name}', ${typesCodegen.valueFromAsc(
        `value as ${
          paramType instanceof tsCodegen.NullableType
            ? paramType.inner.toString()
            : paramType.toString()
        }`,
        fieldValueType
      )})
        }
      `
    )
  }

  _valueTypeFromGraphQl(gqlType) {
    return gqlType.get('kind') === 'NonNullType'
      ? this._valueTypeFromGraphQl(gqlType.get('type'), false)
      : gqlType.get('kind') === 'ListType'
        ? '[' + this._valueTypeFromGraphQl(gqlType.get('type')) + ']'
        : gqlType.getIn(['name', 'value'])
  }

  _typeFromGraphQl(gqlType, nullable = true) {
    return gqlType.get('kind') === 'NonNullType'
      ? this._typeFromGraphQl(gqlType.get('type'), false)
      : gqlType.get('kind') === 'ListType'
        ? nullable
          ? tsCodegen.nullableType(
              tsCodegen.arrayType(this._typeFromGraphQl(gqlType.get('type')))
            )
          : tsCodegen.arrayType(this._typeFromGraphQl(gqlType.get('type')))
        : nullable
          ? tsCodegen.nullableType(
              tsCodegen.namedType(
                typesCodegen.ascTypeForValue(gqlType.getIn(['name', 'value']))
              )
            )
          : tsCodegen.namedType(
              typesCodegen.ascTypeForValue(gqlType.getIn(['name', 'value']))
            )
  }
}
