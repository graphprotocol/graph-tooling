let fs = require('fs-extra')
let graphql = require('graphql/language')
let immutable = require('immutable')

let codegen = require('./codegen')

module.exports = class Schema {
  constructor(filename, document, ast) {
    this.filename = filename
    this.document = document
    this.ast = ast
  }

  generateModuleImports() {
    return [
      codegen.moduleImports(
        [
          // Base classes
          'TypedMap',
          'Entity',

          // Basic Ethereum types
          'Bytes',
          'Address',
          'I128',
          'U128',
          'I256',
          'U256',
          'H256',
        ],
        '@graphprotocol/graph-ts'
      ),
    ]
  }

  generateTypes() {
    return this.ast
      .get('definitions')
      .filter(def => this._isEntityTypeDefinition)
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
    let klass = codegen.klass(name, { export: true, extends: 'Entity' })

    def
      .get('fields')
      .reduce(
        (methods, field) => methods.concat(this._generateEntityFieldMethods(def, field)),
        immutable.List()
      )
      .map(method => klass.addMethod(method))

    console.log(klass)

    return klass
  }

  _generateEntityFieldMethods(entityDef, fieldDef) {
    return immutable.List([
      this._generateEntityFieldGetter(entityDef, fieldDef),
      // this._generateEntityFieldSetter(entityDef, fieldDef),
    ])
  }

  _generateEntityFieldGetter(entityDef, fieldDef) {
    let name = fieldDef.getIn(['name', 'value'])
    let gqlType = fieldDef.get('type')
    console.log('GQL TYPE:', gqlType.toString())
    let ascType = codegen.graphqlTypeToAssemblyScriptType(this.ast, gqlType)
    console.log('-> ASC TYPE:', ascType.toString())
    console.log(
      '-> RESULT:',
      codegen.valueToCoercion(`this.get('${name}')`, ascType).toString()
    )
    return codegen.method(
      `get ${name}`,
      [],
      ascType,
      `
      let value = this.get('${name}')
      if (value == null) {
        return null
      } else {
        return ${codegen.valueToCoercion('value', ascType)}
      }
      `
    )
  }

  _generateEntityFieldSetter(entityDef, fieldDef) {}

  _graphqlTypeToAssemblyScript(gqlType) {
    return 'U256'
  }

  static load(filename) {
    let document = fs.readFileSync(filename, 'utf-8')
    let ast = graphql.parse(document)
    return new Schema(filename, document, immutable.fromJS(ast))
  }
}
