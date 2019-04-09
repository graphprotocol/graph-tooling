const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')

const AbiCodeGenerator = require('./codegen/abi')

const buildSignatureParameter = input => {
  return input.get('type') === 'tuple'
    ? '(' +
        input
          .get('components')
          .map(component => buildSignatureParameter(component))
          .join(',') +
        ')'
    : input.get('type')
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

  eventSignatures() {
    return this.data.filter(entry => entry.get('type') === 'event').map(
      event =>
        `${event.get('name')}(${event
          .get('inputs', immutable.List())
          .map(input => buildSignatureParameter(input))
          .join(',')})`,
    )
  }

  callFunctionSignatures() {
    // An entry is a function if its type is not set or if it is one of
    // 'constructor', 'function' or 'fallback'
    let functionTypes = immutable.Set(['constructor', 'function', 'fallback'])
    let functions = this.data.filter(
      entry => !entry.has('type') || functionTypes.includes(entry.get('type')),
    )

    // A function is a call function if it is nonpayable, payable or
    // not constant
    let mutabilityTypes = immutable.Set(['nonpayable', 'payable'])
    return functions
      .filter(
        entry =>
          mutabilityTypes.includes(entry.get('stateMutability')) ||
          entry.get('constant') === false,
      )
      .map(
        entry =>
          `${entry.get(
            'name',
            entry.get('type') === 'constructor' ? 'constructor' : '<default>'
          )}(${entry
            .get('inputs', immutable.List())
            .map(input => input.get('type'))
            .join(',')})`,
      )
  }

  static load(name, file) {
    let data = JSON.parse(fs.readFileSync(file))

    let abi = null
    if (Array.isArray(data)) {
      abi = data
    } else if (data.abi !== undefined) {
      abi = data.abi
    } else if (
      data.compilerOutput !== undefined &&
      data.compilerOutput.abi !== undefined
    ) {
      abi = data.compilerOutput.abi
    }

    if (abi === null || abi === undefined) {
      throw Error(`No valid ABI in file: ${path.relative(process.cwd(), file)}`)
    }

    return new ABI(name, file, immutable.fromJS(abi))
  }
}
