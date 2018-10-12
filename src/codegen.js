let immutable = require('immutable')
let Map = immutable.Map

const schemaHasNamedType = (schema, name) =>
  schema
    .get('definitions')
    .find(
      def =>
        def.get('kind') === 'ObjectTypeDefinition' &&
        def.getIn(['name', 'value']) === name
    ) !== undefined

const GRAPHQL_TYPE_TO_ASSEMBLY_SCRIPT_TYPE_CONVERTERS = {
  NonNullType: (schema, gqlType) => {
    let inner = gqlType.get('type')
    let innerAsc = graphqlTypeToAssemblyScriptType(schema, inner)
    return unionType(innerAsc, namedType('null'))
  },

  ListType: (schema, gqlType) => {
    let inner = gqlType.get('type')
    let innerAsc = graphqlTypeToAssemblyScriptType(schema, inner)
    return arrayType(innerAsc)
  },

  NamedType: (schema, gqlType) => {
    let name = gqlType.getIn(['name', 'value'])
    console.log('NAME', name)
    let ascType = graphqlTypeToAssemblyScriptType(
      schema,
      gqlType.getIn(['name', 'value'])
    )
    console.log('ASC TYPE', ascType)
    return ascType
  },

  String: () => namedType('string'),
  ID: () => namedType('string'),
  Bytes: () => namedType('Bytes'),
  BigInt: () => namedType('U256'),
  Int: () => namedType('u32'),
  Boolean: () => namedType('boolean'),
}

const graphqlTypeToAssemblyScriptType = (schema, gqlType) => {
  if (Map.isMap(gqlType)) {
    let kind = gqlType.get('kind')
    let converter = GRAPHQL_TYPE_TO_ASSEMBLY_SCRIPT_TYPE_CONVERTERS[kind]
    if (converter !== undefined) {
      return converter(schema, gqlType)
    } else {
      throw Error(`Unsupported GraphQL type: ${kind}`)
    }
  } else {
    let converter = GRAPHQL_TYPE_TO_ASSEMBLY_SCRIPT_TYPE_CONVERTERS[gqlType]
    if (converter !== undefined) {
      return converter(schema, gqlType)
    } else if (schemaHasNamedType(schema, gqlType)) {
      // References are returned as strings
      return namedType('string')
    } else {
      throw Error(`Unsupported GraphQL type: ${gqlType}`)
    }
  }
}

const TYPE_MAP = {
  address: 'Address',
  bool: 'boolean',
  byte: 'Bytes',
  '/bytes([0-9]+)?/': 'Bytes',
  int8: 'i8',
  int16: 'i16',
  int32: 'i32',
  int64: 'i64',
  int128: 'I128',
  int256: 'I256',
  int: 'I256',
  h256: 'H256',
  string: 'string',
  uint8: 'u8',
  uint16: 'u16',
  uint32: 'u32',
  uint64: 'u64',
  uint128: 'U128',
  uint256: 'U256',
  uint: 'U256',
}

const ETHEREUM_VALUE_FROM_TYPE_FUNCTION_MAP = {
  address: 'EthereumValue.fromAddress',
  bool: 'EthereumValue.fromBoolean',
  byte: 'EthereumValue.fromBytes',
  // FIXME: The regex doesn't seem to be working so as a workaround include
  // `bytes32` literally.
  bytes32: 'EthereumValue.fromFixedBytes',
  '/bytes([0-9]+)?/': 'EthereumValue.fromFixedBytes',
  int8: 'EthereumValue.fromI8',
  int16: 'EthereumValue.fromI16',
  int32: 'EthereumValue.fromI32',
  int64: 'EthereumValue.fromI64',
  int128: 'EthereumValue.fromI128',
  int256: 'EthereumValue.fromI256',
  int: 'EthereumValue.fromI256',
  h256: 'EthereumValue.fromH256',
  string: 'EthereumValue.fromString',
  uint8: 'EthereumValue.fromU8',
  uint16: 'EthereumValue.fromU16',
  uint32: 'EthereumValue.fromU32',
  uint64: 'EthereumValue.fromU64',
  uint128: 'EthereumValue.fromU128',
  uint256: 'EthereumValue.fromU256',
  uint: 'EthereumValue.fromU256',
}

const ETHEREUM_VALUE_TO_TYPE_FUNCTION_MAP = {
  address: 'toAddress',
  bool: 'toBoolean',
  byte: 'toBytes',
  '/bytes([0-9]+)?/': 'EthereumValue.toBytes',
  int8: 'toI8',
  int16: 'toI16',
  int32: 'toI32',
  int64: 'toI64',
  int128: 'toI128',
  int256: 'toI256',
  int: 'toI256',
  h256: 'toH256',
  string: 'toString',
  uint8: 'toU8',
  uint16: 'toU16',
  uint32: 'toU32',
  uint64: 'toU64',
  uint128: 'toU128',
  uint256: 'toU256',
  uint: 'toU256',
}

const VALUE_TO_TYPE_FUNCTION_MAP = {
  string: 'toString',
  BigInt: 'toU265',
  Bytes: 'toBytes',
}

const findMatch = (m, type) => {
  let matchingKey = Object.keys(m).find(key => type.match(key))
  return matchingKey !== undefined ? m[matchingKey] : undefined
}

const maybeInspectArray = type => {
  let pattern = /(.+)\[([0-9]*)\]$/
  let match = type.match(pattern)
  if (match !== null && match[2] !== undefined) {
    return [true, match[1]]
  } else {
    return [false, type]
  }
}

const typeToString = type => {
  console.log('Type to string:', type, type instanceof UnionType)

  if (type instanceof UnionType) {
    return type.types.map(type => typeToString(type)).join(' | ')
  } else if (type instanceof NamedType) {
    return type.toString()
  } else {
    let [isArray, innerType] = maybeInspectArray(type)
    let tsType = TYPE_MAP[innerType] || findMatch(TYPE_MAP, innerType)

    if (tsType !== undefined) {
      return isArray ? `Array<${tsType}>` : tsType
    } else {
      throw `Unsupported type: ${type}`
    }
  }
}

const ethereumValueFromTypeFunction = type => {
  let fromFunction =
    ETHEREUM_VALUE_FROM_TYPE_FUNCTION_MAP[type] ||
    findMatch(ETHEREUM_VALUE_FROM_TYPE_FUNCTION_MAP, type)

  if (fromFunction !== undefined) {
    return fromFunction
  } else {
    throw `Unsupported EthereumValue from type coercion for type: ${type}`
  }
}

const ethereumValueToTypeFunction = type => {
  let [isArray, innerType] = maybeInspectArray(type)
  let toFunction =
    ETHEREUM_VALUE_TO_TYPE_FUNCTION_MAP[innerType] ||
    findMatch(ETHEREUM_VALUE_TO_TYPE_FUNCTION_MAP, innerType)

  if (toFunction !== undefined) {
    return isArray ? `${toFunction}Array` : toFunction
  } else {
    throw `Unsupported EthereumValue to type coercion for type: ${type}`
  }
}

const valueToTypeFunction = type => {
  console.log('VALUE TO TYPE FUNCTION:', type)
  let fn =
    type instanceof ArrayType
      ? `${valueToTypeFunction(type.inner)}Array`
      : type instanceof UnionType
        ? `${valueToTypeFunction(type.types[0])}`
        : VALUE_TO_TYPE_FUNCTION_MAP[type.name] || undefined
  console.log('FN:', fn)
  return fn
  //typeof type === 'ArrayType'
  //  ? `${valueToTypeFunction(type.inner)}Array`
  //  : VALUE_TO_TYPE_FUNCTION_MAP[type.name] || undefined
}

//let [isArray, innerType] = maybeInspectArray(type)
//let toFunction =
//  VALUE_TO_TYPE_FUNCTION_MAP[innerType] ||
//  findMatch(VALUE_TO_TYPE_FUNCTION_MAP, innerType)

//if (toFunction !== undefined) {
//  return isArray ? `${toFunction}Array` : toFunction
//} else {
//  throw `Unsupported Value to type coercion for type: ${type}`
//}

class Param {
  constructor(name, type) {
    this.name = name
    this.type = type
  }

  toString() {
    return `${this.name}: ${this.type.toString()}`
  }
}

class ReturnType {
  constructor(name, type) {
    this.name = name
    this.type = type
  }

  toString() {
    return `${typeToString(this.type)}`
  }
}

class EthereumValueFromCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${ethereumValueFromTypeFunction(this.type)}(${this.expr})`
  }
}

class EthereumValueToCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${this.expr}.${ethereumValueToTypeFunction(this.type)}()`
  }
}

class Method {
  constructor(name, params, returnType, body) {
    this.name = name
    this.params = params || []
    this.returnType = returnType || namedType('void')
    this.body = body || ''
  }

  toString() {
    return `
  ${this.name}(${this.params.map(param => param.toString()).join(', ')})${
      this.returnType ? `: ${this.returnType.toString()}` : ''
    } {${this.body}
  }
`
  }
}

class StaticMethod {
  constructor(name, params, returnType, body) {
    this.name = name
    this.params = params || []
    this.returnType = returnType || 'void'
    this.body = body || ''
  }

  toString() {
    return `
  static ${this.name}(${this.params.map(param => param.toString()).join(', ')})${
      this.returnType ? `: ${this.returnType.name}` : ''
    } {${this.body}
  }
`
  }
}

class Class {
  constructor(name, options) {
    this.name = name
    this.extends = options.extends
    this.methods = []
    this.members = []
    this.export = options.export || false
  }

  addMember(member) {
    this.members.push(member)
  }

  addMethod(method) {
    this.methods.push(method)
  }

  toString() {
    return `
${this.export ? 'export' : ''} class ${this.name}${
      this.extends ? ` extends ${this.extends}` : ''
    } {
${this.members.map(member => member.toString()).join('\n')}
${this.methods.map(method => method.toString()).join('')}
}
`
  }
}

class ClassMember {
  constructor(name, type) {
    this.name = name
    this.type = type
  }

  toString() {
    return `  ${this.name}: ${this.type.toString()}`
  }
}

class NamedType {
  constructor(name) {
    this.name = name
  }

  toString() {
    return this.name
  }
}

class SimpleType {
  constructor(name) {
    this.name = typeToString(name)
  }

  toString() {
    return this.name
  }
}

class ArrayType {
  constructor(inner) {
    this.inner = inner
    this.name = `Array<${typeToString(inner)}>`
  }

  toString() {
    return this.name
  }
}

class UnionType {
  constructor(types) {
    this.types = types
  }

  toString() {
    return this.types.map(t => t.name).join(' | ')
  }
}

class MaybeType {
  constructor(type) {
    this.type = type
  }

  toString() {
    return `?${this.type.name}`
  }
}

class ModuleImports {
  constructor(nameOrNames, module) {
    this.nameOrNames = nameOrNames
    this.module = module
  }

  toString() {
    return `import { ${
      typeof this.nameOrNames === 'string' ? this.nameOrNames : this.nameOrNames.join(',')
    } } from "${this.module}"`
  }
}

class ModuleImport {
  constructor(alias, module) {
    this.alias = alias
    this.module = module
  }

  toString() {
    return `import * as ${this.alias} from "${this.module}"`
  }
}

class ValueToCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    console.log('VALUE TO COERCION:', this.expr, this.type)
    return `${this.expr}.${valueToTypeFunction(this.type)}()`
  }
}

const namedType = name => new NamedType(name)
const simpleType = name => new SimpleType(name)
const arrayType = name => new ArrayType(name)
const param = (name, type) => new Param(name, type)
const method = (name, params, returnType, body) =>
  new Method(name, params, returnType, body)
const staticMethod = (name, params, returnType, body) =>
  new StaticMethod(name, params, returnType, body)
const klass = (name, options) => new Class(name, options)
const klassMember = (name, type) => new ClassMember(name, type)
const ethereumValueFromCoercion = (expr, type) =>
  new EthereumValueFromCoercion(expr, type)
const ethereumValueToCoercion = (expr, type) => new EthereumValueToCoercion(expr, type)
const unionType = (...types) => new UnionType(types)
const moduleImports = (nameOrNames, module) => new ModuleImports(nameOrNames, module)
const valueToCoercion = (expr, type) => new ValueToCoercion(expr, type)

module.exports = {
  namedType,
  simpleType,
  arrayType,
  klass,
  klassMember,
  method,
  staticMethod,
  param,
  ethereumValueFromCoercion,
  ethereumValueToCoercion,
  unionType,
  moduleImports,
  valueToCoercion,
  graphqlTypeToAssemblyScriptType,
}
