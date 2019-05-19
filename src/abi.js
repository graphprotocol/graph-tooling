const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')

const AbiCodeGenerator = require('./codegen/abi')

const buildOldSignatureParameter = input => {
  return input.type === 'tuple'
    ? `(${input.components
        .map(component => buildSignatureParameter(component))
        .join(',')})`
    : `${input.type}`
}

const buildSignatureParameter = input => {
  return input.type === 'tuple'
    ? `(${input.indexed ? 'indexed ' : ''}${input.components
        .map(component => buildSignatureParameter(component))
        .join(',')})`
    : `${input.indexed ? 'indexed ' : ''}${input.type}`
}

module.exports = class ABI {
  constructor(name, file, data) {
    this.name = name
    this.file = file
    this.data = data
  }

  codeGenerator() {
    return new AbiCodeGenerator(this)
  }

  static oldEventSignature(event) {
    return `${event.name}(${(event.inputs || [])
      .map(input => buildOldSignatureParameter(input))
      .join(',')})`
  }

  static eventSignature(event) {
    return `${event.name}(${(event.inputs || [])
      .map(input => buildSignatureParameter(input))
      .join(',')})`
  }

  oldEventSignatures() {
    return this.data
      .filter(entry => entry.get('type') === 'event')
      .map(event => event.toJS())
      .map(ABI.oldEventSignature)
  }

  eventSignatures() {
    return this.data
      .filter(entry => entry.get('type') === 'event')
      .map(event => event.toJS())
      .map(ABI.eventSignature)
  }

  callFunctions() {
    // An entry is a function if its type is not set or if it is one of
    // 'constructor', 'function' or 'fallback'
    let functionTypes = immutable.Set(['constructor', 'function', 'fallback'])
    let functions = this.data.filter(
      entry => !entry.has('type') || functionTypes.includes(entry.get('type')),
    )

    // A function is a call function if it is nonpayable, payable or
    // not constant
    let mutabilityTypes = immutable.Set(['nonpayable', 'payable'])
    return functions.filter(
      entry =>
        mutabilityTypes.includes(entry.get('stateMutability')) ||
        entry.get('constant') === false,
    )
  }

  callFunctionSignatures() {
    return this.callFunctions().map(
      entry =>
        `${entry.get(
          'name',
          entry.get('type') === 'constructor' ? 'constructor' : '<default>',
        )}(${entry
          .get('inputs', immutable.List())
          .map(input => input.get('type'))
          .join(',')})`,
    )
  }

  static normalized(json) {
    if (Array.isArray(json)) {
      return json
    } else if (json.abi !== undefined) {
      return json.abi
    } else if (
      json.compilerOutput !== undefined &&
      json.compilerOutput.abi !== undefined
    ) {
      return json.compilerOutput.abi
    } else {
      return undefined
    }
  }

  static load(name, file) {
    let data = JSON.parse(fs.readFileSync(file))
    let abi = ABI.normalized(data)

    if (abi === null || abi === undefined) {
      throw Error(`No valid ABI in file: ${path.relative(process.cwd(), file)}`)
    }

    return new ABI(name, file, immutable.fromJS(abi))
  }
}
