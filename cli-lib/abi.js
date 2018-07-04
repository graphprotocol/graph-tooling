let fs = require('fs-extra')
let immutable = require('immutable')

let codegen = require('./codegen')

module.exports = class ABI {
  constructor(name, path, data) {
    this.name = name
    this.path = path
    this.data = data
  }

  generateTypes() {
    return this._generateSmartContractClass()
  }

  _generateSmartContractClass() {
    let klass = codegen.klass(this.name, { extends: 'SmartContract' })
    let types = immutable.List()

    const paramName = (name, index) =>
      name === undefined || name === null || name === '' ? `param${index}` : name

    klass.addMethod(
      codegen.staticMethod(
        'bind',
        immutable.List([
          codegen.param('address', 'address'),
          codegen.param('blockHash', 'h256'),
        ]),
        klass,
        `
        return new ${this.name}('${this.name}', address, blockHash);
        `
      )
    )

    this.data.forEach(member => {
      switch (member.get('type')) {
        case 'function':
          if (member.get('stateMutability') === 'view') {
            // Generate a type for the result of calling the function
            let returnType = undefined
            let simpleReturnType = true
            if (member.get('outputs').size > 1) {
              simpleReturnType = false
              returnType = codegen.klass(
                this.name + '__' + member.get('name') + 'Result',
                {}
              )
              returnType.addMethod(
                codegen.method(
                  'constructor',
                  member
                    .get('outputs')
                    .map((output, index) =>
                      codegen.param(`value${index}`, output.get('type'))
                    ),
                  null,
                  member
                    .get('outputs')
                    .map((output, index) => `this.value${index} = value${index}`)
                    .join('\n')
                )
              )
              member
                .get('outputs')
                .map((output, index) =>
                  codegen.klassMember(`value${index}`, output.get('type'))
                )
                .forEach(member => returnType.addMember(member))

              // Add the type to the types we'll create
              types = types.push(returnType)
            } else {
              returnType = codegen.simpleType(
                member
                  .get('outputs')
                  .get(0)
                  .get('type')
              )
            }

            // Generate and add a method that implements calling the function on
            // the smart contract
            klass.addMethod(
              codegen.method(
                member.get('name'),
                member
                  .get('inputs')
                  .map((input, index) =>
                    codegen.param(paramName(input.get('name'), index), input.get('type'))
                  ),
                returnType,
                `let __result = super.call(
                   '${member.get('name')}',
                   [${
                     member.get('inputs')
                       ? member
                           .get('inputs')
                           .map((input, index) =>
                             codegen.tokenFromCoercion(
                               paramName(input.get('name'), index),
                               input.get('type')
                             )
                           )
                           .map(coercion => coercion.toString())
                           .join(', ')
                       : ''
                   }]
                 )
                 return ${
                   simpleReturnType
                     ? codegen.tokenToCoercion(
                         '__result[0]',
                         member
                           .get('outputs')
                           .get(0)
                           .get('type')
                       )
                     : `new ${returnType.name}(
                   ${member
                     .get('outputs')
                     .map((output, index) =>
                       codegen.tokenToCoercion(`__result[${index}]`, output.get('type'))
                     )
                     .join(', ')}
                 )`
                 }`
              )
            )
          }
      }
    })

    return [...types, klass]
  }

  static load(name, path) {
    let data = JSON.parse(fs.readFileSync(path))
    return new ABI(name, path, immutable.fromJS(data))
  }
}
