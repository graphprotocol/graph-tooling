let immutable = require('immutable')

const TYPE_MAP = {
  address: 'Address',
  bytes: 'Bytes',
  bytes32: 'Bytes32',
  bool: 'bool',
  string: 'string',
  uint8: 'u32',
  uint256: 'U256',
  'uint256[]': 'Array<U256>',
}

const VALUE_FROM_TYPE_FUNCTION_MAP = {
  address: 'Value.fromAddress',
  bytes: 'Value.fromBytes',
  bytes32: 'Value.fromBytes32',
  bool: 'Value.fromBoolean',
  uint8: 'Value.fromU32',
  uint256: 'Value.fromU256',
}

const VALUE_TO_TYPE_FUNCTION_MAP = {
  address: 'toAddress',
  bytes: 'toBytes',
  bytes32: 'toBytes32',
  uint8: 'toU32',
  uint256: 'toU256',
  bool: 'toBoolean',
}

const typeToString = type => {
  if (TYPE_MAP[type] !== undefined) {
    return TYPE_MAP[type]
  } else {
    throw `Unsupported type: ${type}`
  }
}

const valueFromTypeFunction = type => {
  if (VALUE_FROM_TYPE_FUNCTION_MAP[type] !== undefined) {
    return VALUE_FROM_TYPE_FUNCTION_MAP[type]
  } else {
    throw `Unsupported Value from type coercion for type: ${type}`
  }
}

const valueToTypeFunction = type => {
  if (VALUE_TO_TYPE_FUNCTION_MAP[type] !== undefined) {
    return VALUE_TO_TYPE_FUNCTION_MAP[type]
  } else {
    throw `Unsupported Value to type coercion for type: ${type}`
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

class ValueFromCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${valueFromTypeFunction(this.type)}(${this.expr})`
  }
}

class ValueToCoercion {
  constructor(expr, type) {
    this.expr = expr
    this.type = type
  }

  toString() {
    return `${this.expr}.${valueToTypeFunction(this.type)}()`
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

class SimpleType {
  constructor(name) {
    this.name = name
  }

  toString() {
    ;`${this.name}`
  }
}

const generateSimpleType = name => new SimpleType(name)
const generateParam = (name, type) => new Param(name, type)
const generateReturnType = (name, type) => new ReturnType(name, type)
const generateMethod = (name, params, returnType, body) =>
  new Method(name, params, returnType, body)
const generateClass = (name, options) => new Class(name, options)
const generateClassMember = (name, type) => new ClassMember(name, type)
const generateValueFromCoercion = (expr, type) => new ValueFromCoercion(expr, type)
const generateValueToCoercion = (expr, type) => new ValueToCoercion(expr, type)

module.exports = {
  generateSimpleType,
  generateClass,
  generateClassMember,
  generateMethod,
  generateParam,
  generateReturnType,
  generateValueFromCoercion,
  generateValueToCoercion,
}
