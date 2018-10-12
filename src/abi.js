let fs = require('fs-extra')
let immutable = require('immutable')

let codegen = require('./codegen')

module.exports = class ABI {
  constructor(name, file, data) {
    this.name = name
    this.file = file
    this.data = data
  }

  generateModuleImports() {
    return [
      codegen.moduleImports(
        [
          // Base classes
          'EthereumEvent',
          'SmartContract',
          'EthereumValue',
          'JSONValue',
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
    return [...this._generateEventTypes(), ...this._generateSmartContractClass()]
  }

  _generateEventTypes() {
    return this.data
      .filter(member => member.get('type') === 'event')
      .map(event => {
        let eventClassName = event.get('name')

        // First, generate a class with the param getters
        let paramsClassName = eventClassName + 'Params'
        let paramsClass = codegen.klass(paramsClassName, { export: true })
        paramsClass.addMember(codegen.klassMember('_event', eventClassName))
        paramsClass.addMethod(
          codegen.method(
            `constructor`,
            [codegen.param(`event`, eventClassName)],
            null,
            `this._event = event`
          )
        )

        event.get('inputs').forEach((input, index) => {
          let name = input.get('name')
          if (name === undefined || name === null || name === '') {
            name = `param${index}`
          }
          paramsClass.addMethod(
            codegen.method(
              `get ${name}`,
              [],
              codegen.simpleType(input.get('type')),
              `
            return ${codegen.ethereumValueToCoercion(
              `this._event.parameters[${index}].value`,
              input.get('type')
            )}
            `
            )
          )
        })

        // Then, generate the event class itself
        let klass = codegen.klass(eventClassName, {
          export: true,
          extends: 'EthereumEvent',
        })
        klass.addMethod(
          codegen.method(
            `get params`,
            [],
            codegen.namedType(paramsClassName),
            `return new ${paramsClassName}(this)`
          )
        )
        return [klass, paramsClass]
      })
      .reduce(
        // flatten the array
        (array, classes) => array.concat(classes),
        []
      )
  }

  _generateSmartContractClass() {
    let klass = codegen.klass(this.name, { export: true, extends: 'SmartContract' })
    let types = immutable.List()

    const paramName = (name, index) =>
      name === undefined || name === null || name === '' ? `param${index}` : name

    klass.addMethod(
      codegen.staticMethod(
        'bind',
        immutable.List([codegen.param('address', codegen.simpleType('address'))]),
        codegen.namedType(this.name),
        `
        return new ${this.name}('${this.name}', address);
        `
      )
    )

    this.data.forEach(member => {
      switch (member.get('type')) {
        case 'function':
          if (
            member.get('stateMutability') === 'view' ||
            member.get('stateMutability') === 'pure'
          ) {
            // Generate a type for the result of calling the function
            let returnType = undefined
            let simpleReturnType = true
            if (member.get('outputs').size > 1) {
              simpleReturnType = false

              // Create a type dedicated to holding the return values
              returnType = codegen.klass(
                this.name + '__' + member.get('name') + 'Result',
                { export: true }
              )

              // Add a constructor to this type
              returnType.addMethod(
                codegen.method(
                  'constructor',
                  member
                    .get('outputs')
                    .map((output, index) =>
                      codegen.param(
                        `value${index}`,
                        codegen.simpleType(output.get('type'))
                      )
                    ),
                  null,
                  member
                    .get('outputs')
                    .map((output, index) => `this.value${index} = value${index}`)
                    .join('\n')
                )
              )

              // Add a `toMap(): TypedMap<string,EthereumValue>` function to the return type
              returnType.addMethod(
                codegen.method(
                  'toMap',
                  [],
                  codegen.namedType('TypedMap<string,EthereumValue>'),
                  `
                  let map = new TypedMap<string,EthereumValue>();
                  ${member
                    .get('outputs')
                    .map(
                      (output, index) =>
                        `map.set('value${index}', ${codegen.ethereumValueFromCoercion(
                          `this.value${index}`,
                          output.get('type')
                        )})`
                    )
                    .join(';')}
                  return map;
                  `
                )
              )

              // Add value0, value1 etc. members to the type
              member
                .get('outputs')
                .map((output, index) =>
                  codegen.klassMember(
                    `value${index}`,
                    codegen.simpleType(output.get('type'))
                  )
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
                    codegen.param(
                      paramName(input.get('name'), index),
                      codegen.simpleType(input.get('type'))
                    )
                  ),
                codegen.namedType(returnType.name),
                `
                let result = super.call(
                  '${member.get('name')}',
                  [${
                    member.get('inputs')
                      ? member
                          .get('inputs')
                          .map((input, index) =>
                            codegen.ethereumValueFromCoercion(
                              paramName(input.get('name'), index),
                              input.get('type')
                            )
                          )
                          .map(coercion => coercion.toString())
                          .join(', ')
                      : ''
                  }]
                );
                return ${
                  simpleReturnType
                    ? codegen.ethereumValueToCoercion(
                        'result[0]',
                        member
                          .get('outputs')
                          .get(0)
                          .get('type')
                      )
                    : `new ${returnType.name}(
                  ${member
                    .get('outputs')
                    .map((output, index) =>
                      codegen.ethereumValueToCoercion(
                        `result[${index}]`,
                        output.get('type')
                      )
                    )
                    .join(', ')}
                )`
                };
                `
              )
            )
          }
      }
    })

    return [...types, klass]
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
