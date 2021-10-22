const immutable = require('immutable')

const tsCodegen = require('./typescript')
const typesCodegen = require('./types')

const List = immutable.List

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

    // Generate and add a constructor
    klass.addMethod(this._generateConstructor(name, def.get('fields')))

    // Generate and add save() and getById() methods
    this._generateStoreMethods(name).forEach(method => klass.addMethod(method))

    // Generate and add entity field getters and setters
    def
      .get('fields')
      .reduce(
        (methods, field) => methods.concat(this._generateEntityFieldMethods(def, field)),
        List(),
      )
      .forEach(method => klass.addMethod(method))

    return klass
  }

  // Fields that are non-nullable get an empty/zero value set in the class constructor.
  _generateDefaultFieldValues(fields) {
    const indexOfIdField = fields.findIndex(field => field.getIn(['name', 'value']) === 'id')
    const fieldsWithoutId = fields.remove(indexOfIdField)

    const fieldsSetCalls = fieldsWithoutId
      .map(field => {
        const name = field.getIn(['name', 'value'])
        const type = this._typeFromGraphQl(field.get('type'))
        const isNullable = type instanceof tsCodegen.NullableType

        const directives = field.get('directives')
        const isDerivedFrom = directives.some(directive => directive.getIn(['name', 'value']) === 'derivedFrom')

        return { name, type, isNullable, isDerivedFrom }
      })
      // We only call the setter with the default value in the constructor for fields that are:
      // - Not nullable, so that AS doesn't break when subgraph developers try to access them before a `set`
      // - Not tagged as `derivedFrom`, because they only exist in query time
      .filter(({ isNullable, isDerivedFrom }) => !isNullable && !isDerivedFrom)
      .map(({ name, type, isNullable }) => {
        const fieldTypeString = isNullable ? type.inner.toString() : type.toString()

        return `
        this.set('${name}', ${typesCodegen.initializedValueFromAsc(fieldTypeString)})`
      })

    return fieldsSetCalls.join('')
  }

  _generateConstructor(entityName, fields) {
    return tsCodegen.method(
      'constructor',
      [tsCodegen.param('id', tsCodegen.namedType('string'))],
      undefined,
      `
      super()
      this.set('id', Value.fromString(id))
      ${this._generateDefaultFieldValues(fields)}
      `,
    )
  }

  _generateStoreMethods(entityName) {
    return List.of(
      tsCodegen.method(
        'save',
        [],
        tsCodegen.namedType('void'),
        `
        let id = this.get('id')
        assert(id != null, 'Cannot save ${entityName} entity without an ID')
        if (id) {
          assert(
            id.kind == ValueKind.STRING,
            'Cannot save ${entityName} entity with non-string ID. ' +
            'Considering using .toHex() to convert the "id" to a string.'
          )
          store.set('${entityName}', id.toString(), this)
        }`,
      ),

      tsCodegen.staticMethod(
        'load',
        [tsCodegen.param('id', tsCodegen.namedType('string'))],
        tsCodegen.nullableType(tsCodegen.namedType(entityName)),
        `
        return changetype<${entityName} | null>(store.get('${entityName}', id))
        `,
      ),
    )
  }

  _generateEntityFieldMethods(entityDef, fieldDef) {
    return List([
      this._generateEntityFieldGetter(entityDef, fieldDef),
      this._generateEntityFieldSetter(entityDef, fieldDef),
    ])
  }

  _generateEntityFieldGetter(entityDef, fieldDef) {
    let name = fieldDef.getIn(['name', 'value'])
    let gqlType = fieldDef.get('type')
    let fieldValueType = this._valueTypeFromGraphQl(gqlType)
    let returnType = this._typeFromGraphQl(gqlType)
    let isNullable = returnType instanceof tsCodegen.NullableType

    let getNonNullable = `return ${typesCodegen.valueToAsc('value!', fieldValueType)}`
    let getNullable = `if (!value || value.kind == ValueKind.NULL) {
                          return null
                        } else {
                          return ${typesCodegen.valueToAsc('value', fieldValueType)}
                        }`

    return tsCodegen.method(
      `get ${name}`,
      [],
      returnType,
      `
       let value = this.get('${name}')
       ${isNullable ? getNullable : getNonNullable}
      `,
    )
  }

  _generateEntityFieldSetter(entityDef, fieldDef) {
    let name = fieldDef.getIn(['name', 'value'])
    let gqlType = fieldDef.get('type')
    let fieldValueType = this._valueTypeFromGraphQl(gqlType)
    let paramType = this._typeFromGraphQl(gqlType)
    let isNullable = paramType instanceof tsCodegen.NullableType
    let paramTypeString = isNullable ? paramType.inner.toString() : paramType.toString()
    let isArray = paramType instanceof tsCodegen.ArrayType

    if (
      isArray &&
      paramType.inner instanceof tsCodegen.NullableType
    ) {
      let arrayTypeWithoutClosingBracked = fieldValueType.slice(0, -1)
      let suggestedType = `${arrayTypeWithoutClosingBracked}!]`

      throw new Error(`
GraphQL schema can't have List's with Nullable members.
Error in '${name}' field of type '${fieldValueType}'.
Suggestion: add an '!' to the member type of the List, change from '${fieldValueType}' to '${suggestedType}'`
      )
    }

    let setNonNullable = `
      this.set('${name}', ${typesCodegen.valueFromAsc(`value`, fieldValueType)})
    `
    let setNullable = `
      if (!value) {
        this.unset('${name}')
      } else {
        this.set('${name}', ${typesCodegen.valueFromAsc(
        `<${paramTypeString}>value`,
      fieldValueType,
    )})
      }
    `

    return tsCodegen.method(
      `set ${name}`,
      [tsCodegen.param('value', paramType)],
      undefined,
      isNullable ? setNullable : setNonNullable,
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
    if (gqlType.get('kind') === 'NonNullType') {
      return this._typeFromGraphQl(gqlType.get('type'), false)
    } else if (gqlType.get('kind') === 'ListType') {
      let type = tsCodegen.arrayType(this._typeFromGraphQl(gqlType.get('type')))
      return nullable ? tsCodegen.nullableType(type) : type
    } else {
      // NamedType
      let type = tsCodegen.namedType(
        typesCodegen.ascTypeForValue(gqlType.getIn(['name', 'value'])),
      )
      // In AssemblyScript, primitives cannot be nullable.
      return nullable && !type.isPrimitive() ? tsCodegen.nullableType(type) : type
    }
  }
}
