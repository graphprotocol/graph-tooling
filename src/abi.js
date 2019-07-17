const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')

const AbiCodeGenerator = require('./codegen/abi')

const buildOldSignatureParameter = input => {
  return input.get('type') === 'tuple'
    ? `(${input
        .get('components')
        .map(component => buildSignatureParameter(component))
        .join(',')})`
    : `${input.get('type')}`
}

const buildSignatureParameter = input => {
  return input.get('type') === 'tuple'
    ? `(${input.get('indexed') ? 'indexed ' : ''}${input
        .get('components')
        .map(component => buildSignatureParameter(component))
        .join(',')})`
    : `${input.get('indexed') ? 'indexed ' : ''}${input.get('type')}`
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
    return `${event.get('name')}(${(event.get('inputs') || [])
      .map(input => buildOldSignatureParameter(input))
      .join(',')})`
  }

  static eventSignature(event) {
    return `${event.get('name')}(${(event.get('inputs') || [])
      .map(input => buildSignatureParameter(input))
      .join(',')})`
  }

  oldEventSignatures() {
    return this.data
      .filter(entry => entry.get('type') === 'event')
      .map(ABI.oldEventSignature)
  }

  eventSignatures() {
    return this.data
      .filter(entry => entry.get('type') === 'event')
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
    return this.callFunctions()
      .filter(entry => entry.get('type') !== 'constructor')
      .map(entry => {
        const name = entry.get('name', '<default>')
        const inputs = entry
          .get('inputs', immutable.List())
          .map(input => input.get('type'))

        return `${name}(${inputs.join(',')})`
      })
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
