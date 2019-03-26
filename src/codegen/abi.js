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
          'Tuple'
        ],
        '@graphprotocol/graph-ts',
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
            `this._event = event`,
          ),
        )

        event.get('inputs').forEach((input, index) => {
          let name = input.get('name')
          let inputType = input.get('indexed')
            ? this._indexedInputType(input.get('type'))
            : input.get('type')

          if (name === undefined || name === null || name === '') {
            name = `param${index}`
          }

          paramsClass.addMethod(
            inputType === 'tuple' ?
              tsCodegen.method(
                `get ${name}`,
                [],
                tsCodegen.namedType(name).capitalize(),
                `
            return <${tsCodegen.namedType(name).capitalize()}>${typesCodegen.ethereumValueToAsc(
                  `this._event.parameters[${index}].value`,
                  inputType
                )}
            `
              ) :
              tsCodegen.method(
                  `get ${name}`,
                  [],
                   typesCodegen.ascTypeForEthereum(inputType),
                  `
                return ${typesCodegen.ethereumValueToAsc(
                  `this._event.parameters[${index}].value`,
                  inputType,
                )}
                `,
              ),
          )
        })

        // Generate param getters differently for Tuple params
        // Also generate a class for each Tuple param
        let tupleKlasses = [];
        event.get('inputs').filter(input => input.get('type') === 'tuple').forEach((input, index) => {
          let tupleKlass = tsCodegen.klass(tsCodegen.namedType(input.get('name')).capitalize(), {
            export: true,
            extends: 'Tuple',
          });
          input.get('components').forEach((component, index) => {
            let name = component.get('name')
            if (name === undefined || name === null || name === '') {
              name = `value${index}`
            }
            tupleKlass.addMethod(
              tsCodegen.method(
              `get ${name}`,
              [],
              typesCodegen.ascTypeForEthereum(component.get('type')),
              `
              return ${typesCodegen.ethereumValueToAsc(
                `this[${index}]`,
                component.get('type')
              )}
              `
              )
            )
          })
          tupleKlasses.push(tupleKlass)
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
            `return new ${paramsClassName}(this)`,
          ),
        )
        return [klass].concat(paramsClass,tupleKlasses)
      })
      .reduce(
        // flatten the array
        (array, classes) => array.concat(classes),
        [],
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
          tsCodegen.param('address', typesCodegen.ascTypeForEthereum('address')),
        ]),
        tsCodegen.namedType(this.abi.name),
        `
        return new ${this.abi.name}('${this.abi.name}', address);
        `,
      ),
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
                { export: true },
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
                        typesCodegen.ascTypeForEthereum(output.get('type')),
                      ),
                    ),
                  null,
                  member
                    .get('outputs')
                    .map((output, index) => `this.value${index} = value${index}`)
                    .join('\n'),
                ),
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
                        `map.set('value${index}', ${typesCodegen.ethereumValueFromAsc(
                          `this.value${index}`,
                          output.get('type'),
                        )})`,
                    )
                    .join(';')}
                  return map;
                  `,
                ),
              )

              // Add value0, value1 etc. members to the type
              member
                .get('outputs')
                .map((output, index) =>
                  tsCodegen.klassMember(
                    `value${index}`,
                    typesCodegen.ascTypeForEthereum(output.get('type')),
                  ),
                )
                .forEach(member => returnType.addMember(member))

              // Add the type to the types we'll create
              types = types.push(returnType)

              returnType = tsCodegen.namedType(returnType.name)
            } else {
              returnType = tsCodegen.namedType(
                typesCodegen.ascTypeForEthereum(
                  member
                    .get('outputs')
                    .get(0)
                    .get('type'),
                ),
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
                      typesCodegen.ascTypeForEthereum(input.get('type')),
                    ),
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
                            typesCodegen.ethereumValueFromAsc(
                              paramName(input.get('name'), index),
                              input.get('type'),
                            ),
                          )
                          .map(coercion => coercion.toString())
                          .join(', ')
                      : ''
                  }]
                );
                return ${
                  simpleReturnType
                    ? typesCodegen.ethereumValueToAsc(
                        'result[0]',
                        member
                          .get('outputs')
                          .get(0)
                          .get('type'),
                      )
                    : `new ${returnType.name}(
                  ${member
                    .get('outputs')
                    .map((output, index) =>
                      typesCodegen.ethereumValueToAsc(
                        `result[${index}]`,
                        output.get('type'),
                      ),
                    )
                    .join(', ')}
                )`
                };
                `,
              ),
            )
          }
      }
    })

    return [...types, klass]
  }

  _indexedInputType(inputType) {
    // strings, bytes and arrays are encoded and hashed to a bytes32 value
    if (
      inputType === 'string' ||
      inputType === 'bytes' ||
      // the following matches arrays of the forms `uint256[]` and `uint256[12356789]`;
      // the value type name doesn't matter here, just that the type name ends with
      // brackets and, optionally, a number inside the brackets
      inputType.match(/\[[0-9]*\]$/g)
    ) {
      return 'bytes32'
    } else {
      return inputType
    }
  }
}
