let fs = require('fs-extra')
let immutable = require('immutable')

let AbiCodeGenerator = require('./codegen/abi')

module.exports = class ABI {
  constructor(name, file, data) {
    this.name = name
    this.file = file
    this.data = data
  }

  codeGenerator() {
    return new AbiCodeGenerator(this)
  }

  static load(name, file) {
    let data = JSON.parse(fs.readFileSync(file))

    let abi = null
    if (Array.isArray(data)) {
      abi = data
    } else if (data.abi !== undefined) {
      abi = data.abi
    } else if (data.compilerOutput !== undefined && data.compilerOutput.abi !== undefined) {
      abi = data.compilerOutput.abi
    }

    if (abi === null || abi === undefined) {
      throw Error(`Could not extract ABI from ${file}`)
    }
  
    return new ABI(name, file, immutable.fromJS(abi))
  }
}
