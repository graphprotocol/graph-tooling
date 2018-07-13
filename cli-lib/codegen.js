let immutable = require('immutable')

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
  uint128: 'I128',
  uint256: 'U256',
  uint: 'U256',
}

const TOKEN_FROM_TYPE_FUNCTION_MAP = {
  address: 'Token.fromAddress',
  bool: 'Token.fromBoolean',
  byte: 'Token.fromBytes',
  '/bytes([0-9]+)?/': 'Token.fromBytes',
  int8: 'Token.fromI8',
  int16: 'Token.fromI16',
  int32: 'Token.fromI32',
  int64: 'Token.fromI64',
  int128: 'Token.fromI128',
  int256: 'Token.fromI256',
  int: 'Token.fromI256',
  h256: 'Token.fromH256',
  string: 'Token.fromString',
  uint8: 'Token.fromU8',
  uint16: 'Token.fromU16',
  uint32: 'Token.fromU32',
  uint64: 'Token.fromU64',
  uint128: 'Token.fromU128',
  uint256: 'Token.fromU256',
  uint: 'Token.fromU256',
}

const TOKEN_TO_TYPE_FUNCTION_MAP = {
  address: 'toAddress',
  bool: 'toBoolean',
  byte: 'toBytes',
  '/bytes([0-9]+)?/': 'Token.toBytes',
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
  let [isArray, innerType] = maybeInspectArray(type)
  let tsType = TYPE_MAP[innerType] || findMatch(TYPE_MAP, innerType)

  if (tsType !== undefined) {
    return isArray ? `Array<${tsType}>` : tsType
  } else {
    throw `Unsupported type: ${type}`
  }
}

const tokenFromTypeFunction = type => {
  let fromFunction =
    TOKEN_FROM_TYPE_FUNCTION_MAP[type] || findMatch(TOKEN_FROM_TYPE_FUNCTION_MAP, type)

  if (fromFunction !== undefined) {
    return fromFunction
  } else {
    throw `Unsupported Token from type coercion for type: ${type}`
  }
}

const tokenToTypeFunction = type => {
  let [isArray, innerType] = maybeInspectArray(type)
  let toFunction =
    TOKEN_TO_TYPE_FUNCTION_MAP[innerType] ||
    findMatch(TOKEN_TO_TYPE_FUNCTION_MAP, innerType)

  if (toFunction !== undefined) {
    return isArray ? `${toFunction}Array` : toFunction
  } else {
    throw `Unsupported Token to type coercion for type: ${type}`
  }
}

class Param {
  constructor(name, type) {
    this.name = name
    this.type = type
  }

  toString() {
    return `${this.name}: ${typeToString(this.type)}`
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

class TokenFromCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${tokenFromTypeFunction(this.type)}(${this.expr})`
  }
}

class TokenToCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${this.expr}.${tokenToTypeFunction(this.type)}()`
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
      this.returnType ? `: ${this.returnType.name}` : ''
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
  }

  addMember(member) {
    this.members.push(member)
  }

  addMethod(method) {
    this.methods.push(method)
  }

  toString() {
    return `
class ${this.name}${this.extends ? ` extends ${this.extends}` : ''} {
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
    return `  ${this.name}: ${typeToString(this.type)}`
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

const namedType = name => new NamedType(name)
const simpleType = name => new SimpleType(name)
const param = (name, type) => new Param(name, type)
const method = (name, params, returnType, body) =>
  new Method(name, params, returnType, body)
const staticMethod = (name, params, returnType, body) =>
  new StaticMethod(name, params, returnType, body)
const klass = (name, options) => new Class(name, options)
const klassMember = (name, type) => new ClassMember(name, type)
const tokenFromCoercion = (expr, type) => new TokenFromCoercion(expr, type)
const tokenToCoercion = (expr, type) => new TokenToCoercion(expr, type)
const unionType = (...types) => new UnionType(types)

module.exports = {
  namedType,
  simpleType,
  klass,
  klassMember,
  method,
  staticMethod,
  param,
  tokenFromCoercion,
  tokenToCoercion,
  unionType,
}
