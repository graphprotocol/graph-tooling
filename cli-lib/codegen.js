let immutable = require('immutable')

const TYPE_MAP = {
  address: 'Address',
  bool: 'bool',
  bytes: 'Bytes',
  bytes32: 'Bytes',
  h256: 'H256',
  string: 'string',
  uint8: 'u8',
  uint256: 'U256',
  'uint256[]': 'Array<U256>',
}

const TOKEN_FROM_TYPE_FUNCTION_MAP = {
  address: 'Token.fromAddress',
  bool: 'Token.fromBoolean',
  bytes: 'Token.fromBytes',
  bytes32: 'Token.fromBytes',
  h256: 'Token.fromH256',
  string: 'Token.fromString',
  uint8: 'Token.fromU8',
  uint256: 'Token.fromU256',
}

const TOKEN_TO_TYPE_FUNCTION_MAP = {
  address: 'toAddress',
  bool: 'toBoolean',
  bytes: 'toBytes',
  bytes32: 'toBytes',
  h256: 'toH256',
  string: 'toString',
  uint8: 'toU8',
  uint256: 'toU256',
}

const typeToString = type => {
  if (TYPE_MAP[type] !== undefined) {
    return TYPE_MAP[type]
  } else {
    throw `Unsupported type: ${type}`
  }
}

const tokenFromTypeFunction = type => {
  if (TOKEN_FROM_TYPE_FUNCTION_MAP[type] !== undefined) {
    return TOKEN_FROM_TYPE_FUNCTION_MAP[type]
  } else {
    throw `Unsupported Token from type coercion for type: ${type}`
  }
}

const tokenToTypeFunction = type => {
  if (TOKEN_TO_TYPE_FUNCTION_MAP[type] !== undefined) {
    return TOKEN_TO_TYPE_FUNCTION_MAP[type]
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
    this.returnType = returnType || 'void'
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
}
