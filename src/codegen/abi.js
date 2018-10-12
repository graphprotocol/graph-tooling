const immutable = require('immutable')

const tsCodegen = require('./typescript')
const typesCodegen = require('./types')

module.exports = class AbiCodeGenerator {
  constructor(abi) {
    this.abi = abi
  }

  generateModuleImports() {
    return [
      tsCodegen.moduleImports(
        [
          // Base classes
          'EthereumEvent',
          'SmartContract',
          'EthereumValue',
          'JSONValue',
          'TypedMap',
          'Entity',

          // AssemblyScript types
          'Bytes',
          'Address',
          'BigInt',
        ],
        '@graphprotocol/graph-tsCodegen'
      ),
    ]
  }

  generateTypes() {
    return [...this._generateEventTypes(), ...this._generateSmartContractClass()]
  }

  _generateEventTypes() {
    return this.abi.data
      .filter(member => member.get('type') === 'event')
      .map(event => {
        let eventClassName = event.get('name')

        // First, generate a class with the param getters
        let paramsClassName = eventClassName + 'Params'
        let paramsClass = tsCodegen.klass(paramsClassName, { export: true })
        paramsClass.addMember(tsCodegen.klassMember('_event', eventClassName))
        paramsClass.addMethod(
          tsCodegen.method(
            `constructor`,
            [tsCodegen.param(`event`, eventClassName)],
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
            tsCodegen.method(
              `get ${name}`,
              [],
              typesCodegen.ascTypeFromEthereum(input.get('type')),
              `
            return ${typesCodegen.ethereumToAsc(
              input.get('type'),
              `this._event.parameters[${index}].value`
            )}
            `
            )
          )
        })

        // Then, generate the event class itself
        let klass = tsCodegen.klass(eventClassName, {
          export: true,
          extends: 'EthereumEvent',
        })
        klass.addMethod(
          tsCodegen.method(
            `get params`,
            [],
            tsCodegen.namedType(paramsClassName),
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
    let klass = tsCodegen.klass(this.abi.name, { export: true, extends: 'SmartContract' })
    let types = immutable.List()

    const paramName = (name, index) =>
      name === undefined || name === null || name === '' ? `param${index}` : name

    klass.addMethod(
      tsCodegen.staticMethod(
        'bind',
        immutable.List([
          tsCodegen.param('address', typesCodegen.ascTypeFromEthereum('address')),
        ]),
        tsCodegen.namedType(this.abi.name),
        `
        return new ${this.abi.name}('${this.abi.name}', address);
        `
      )
    )

    this.abi.data.forEach(member => {
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
              returnType = tsCodegen.klass(
                this.abi.name + '__' + member.get('name') + 'Result',
                { export: true }
              )

              // Add a constructor to this type
              returnType.addMethod(
                tsCodegen.method(
                  'constructor',
                  member
                    .get('outputs')
                    .map((output, index) =>
                      tsCodegen.param(
                        `value${index}`,
                        typesCodegen.ascTypeFromEthereum(output.get('type'))
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
                tsCodegen.method(
                  'toMap',
                  [],
                  tsCodegen.namedType('TypedMap<string,EthereumValue>'),
                  `
                  let map = new TypedMap<string,EthereumValue>();
                  ${member
                    .get('outputs')
                    .map(
                      (output, index) =>
                        `map.set('value${index}', ${typesCodegen.ascToEthereum(
                          output.get('type'),
                          `this.value${index}`
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
                  tsCodegen.klassMember(
                    `value${index}`,
                    typesCodegen.ascTypeFromEthereum(output.get('type'))
                  )
                )
                .forEach(member => returnType.addMember(member))

              // Add the type to the types we'll create
              types = types.push(returnType)

              returnType = tsCodegen.namedType(returnType.name)
            } else {
              returnType = tsCodegen.namedType(
                typesCodegen.ascTypeFromEthereum(
                  member
                    .get('outputs')
                    .get(0)
                    .get('type')
                )
              )
            }

            // Generate and add a method that implements calling the function on
            // the smart contract
            klass.addMethod(
              tsCodegen.method(
                member.get('name'),
                member
                  .get('inputs')
                  .map((input, index) =>
                    tsCodegen.param(
                      paramName(input.get('name'), index),
                      typesCodegen.ascTypeFromEthereum(input.get('type'))
                    )
                  ),
                returnType,
                `
                let result = super.call(
                  '${member.get('name')}',
                  [${
                    member.get('inputs')
                      ? member
                          .get('inputs')
                          .map((input, index) =>
                            typesCodegen.ethereumToAsc(
                              input.get('type'),
                              paramName(input.get('name'), index)
                            )
                          )
                          .map(coercion => coercion.toString())
                          .join(', ')
                      : ''
                  }]
                );
                return ${
                  simpleReturnType
                    ? typesCodegen.ethereumToAsc(
                        member
                          .get('outputs')
                          .get(0)
                          .get('type'),
                        'result[0]'
                      )
                    : `new ${returnType.name}(
                  ${member
                    .get('outputs')
                    .map((output, index) =>
                      typesCodegen.ethereumToAsc(output.get('type'), `result[${index}]`)
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
}
