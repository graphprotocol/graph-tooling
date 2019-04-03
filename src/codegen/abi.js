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
          'EthereumCall',
          'EthereumEvent',
          'SmartContract',
          'EthereumValue',
          'JSONValue',
          'TypedMap',
          'Entity',
          'EthereumTuple',

          // AssemblyScript types
          'Bytes',
          'Address',
          'BigInt',
        ],
        '@graphprotocol/graph-ts',
      ),
    ]
  }

  generateTypes() {
    return [
      ...this._generateEventTypes(),
      ...this._generateSmartContractClass(),
      ...this._generateCallTypes(),
    ]
  }

  _generateCallTypes() {
    return this.abi
      .callFunctions()
      .map(fn => {
        let fnName = fn.get(
          'name',
          fn.get('type') === 'constructor' ? 'constructor' : 'default',
        )
        let fnClassName = `${fnName.charAt(0).toUpperCase()}${fnName.slice(1)}Call`
        let tupleClasses = []

        // First, generate a class with the input getters
        let inputsClassName = fnClassName + 'Inputs'
        let inputsClass = tsCodegen.klass(inputsClassName, { export: true })
        inputsClass.addMember(tsCodegen.klassMember('_call', fnClassName))
        inputsClass.addMethod(
          tsCodegen.method(
            `constructor`,
            [tsCodegen.param(`call`, fnClassName)],
            null,
            `this._call = call`,
          ),
        )

        // Generate getters and classes for function inputs
        fn.get('inputs', immutable.List()).forEach((input, index) => {
          let callInput = this._generateInputOrOutput(
            input,
            index,
            fnClassName,
            `call`,
            `inputValues`,
          )
          inputsClass.addMethod(callInput.getter)
          tupleClasses.push(...callInput.classes)
        })

        // Second, generate a class with the output getters
        let outputsClassName = fnClassName + 'Outputs'
        let outputsClass = tsCodegen.klass(outputsClassName, { export: true })
        outputsClass.addMember(tsCodegen.klassMember('_call', fnClassName))
        outputsClass.addMethod(
          tsCodegen.method(
            `constructor`,
            [tsCodegen.param(`call`, fnClassName)],
            null,
            `this._call = call`,
          ),
        )

        // Generate getters and classes for function outputs
        fn.get('outputs', immutable.List()).forEach((output, index) => {
          let callInput = this._generateInputOrOutput(
            output,
            index,
            fnClassName,
            `call`,
            `outputValues`,
          )
          outputsClass.addMethod(callInput.getter)
          tupleClasses.push(...callInput.classes)
        })

        // Then, generate the event class itself
        let klass = tsCodegen.klass(fnClassName, {
          export: true,
          extends: 'EthereumCall',
        })
        klass.addMethod(
          tsCodegen.method(
            `get inputs`,
            [],
            tsCodegen.namedType(inputsClassName),
            `return new ${inputsClassName}(this)`,
          ),
        )
        klass.addMethod(
          tsCodegen.method(
            `get outputs`,
            [],
            tsCodegen.namedType(outputsClassName),
            `return new ${outputsClassName}(this)`,
          ),
        )
        return [klass, inputsClass, outputsClass, ...tupleClasses]
      })
      .reduce(
        // flatten the array
        (array, classes) => array.concat(classes),
        [],
      )
  }

  _generateEventTypes() {
    // Keep a map of how many events were generated so far with the given name.
    // If there are no name collisions, all entries map to 1.
    let generatedEvents = new Map()
    return this.abi.data
      .filter(member => member.get('type') === 'event')
      .map(event => {
        let eventClassName = event.get('name')
        let currentCount = generatedEvents.get(eventClassName)
        if (currentCount === undefined) {
          generatedEvents.set(eventClassName, 1)
        } else {
          generatedEvents.set(eventClassName, currentCount + 1)
          eventClassName += currentCount
        }
        let tupleClasses = []

        // First, generate a class with the param getters
        let paramsClassName = eventClassName + '__Params'
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
          // Generate getters and classes for event params
          let paramObject = this._generateInputOrOutput(
            input,
            index,
            eventClassName,
            `event`,
            `parameters`,
          )
          paramsClass.addMethod(paramObject.getter)
          tupleClasses.push(...paramObject.classes)
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
        return [klass, paramsClass, ...tupleClasses]
      })
      .reduce(
        // flatten the array
        (array, classes) => array.concat(classes),
        [],
      )
  }

  _generateInputOrOutput(inputOrOutput, index, parentClass, parentType, parentField) {
    // Get name and type of the param, adjusting for indexed params and missing names
    let name = inputOrOutput.get('name')
    let valueType =
      parentType === 'event' && inputOrOutput.get('indexed')
        ? this._indexedInputType(inputOrOutput.get('type'))
        : inputOrOutput.get('type')

    if (name === undefined || name === null || name === '') {
      name = parentType === 'event' ? `param${index}` : `value${index}`
    }

    // Generate getters and classes for the param (classes only created for EthereumTuple types)
    return valueType === 'tuple'
      ? this._generateTupleType(
          inputOrOutput,
          index,
          parentClass,
          parentType,
          parentField,
        )
      : {
          getter: tsCodegen.method(
            `get ${name}`,
            [],
            typesCodegen.ascTypeForEthereum(valueType),
            `
            return ${typesCodegen.ethereumValueToAsc(
              parentType === 'tuple'
                ? `this[${index}]`
                : `this._${parentType}.${parentField}[${index}].value`,
              valueType,
            )}
            `,
          ),
          classes: [],
        }
  }

  _generateTupleType(inputOrOutput, index, parentClass, parentType, parentField) {
    let name = inputOrOutput.get('name')
    if (name === undefined || name === null || name === '') {
      name = parentType === 'event' ? `param${index}` : `value${index}`
    }

    let tupleIdentifier = parentClass + tsCodegen.namedType(name).capitalize()
    let tupleClassName = tupleIdentifier + 'Struct'
    let tupleClasses = []

    // Generate getter for parent class
    let tupleGetter = tsCodegen.method(
      `get ${name}`,
      [],
      tupleClassName,
      `
      return ${typesCodegen.ethereumValueToAsc(
        parentType === 'tuple'
          ? `this[${index}]`
          : `this._${parentType}.${parentField}[${index}].value`,
        'tuple',
      )} as ${tupleClassName}
      `,
    )

    // Generate tuple class
    let baseTupleClass = tsCodegen.klass(tupleClassName, {
      export: true,
      extends: 'EthereumTuple',
    })

    // Add param getters to tuple class and generate classes for each tuple parameter
    input.get('components').forEach((component, index) => {
      let name = component.get('name')
      let paramObject = this._generateInputOrOutput(
        component,
        index,
        tupleIdentifier,
        `tuple`,
      )
      baseTupleClass.addMethod(paramObject.getter)
      tupleClasses = tupleClasses.concat(paramObject.classes)
    })

    // Combine all tuple classes generated
    tupleClasses.unshift(baseTupleClass)

    return {
      getter: tupleGetter,
      classes: tupleClasses,
    }
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

    let generatedMethods = new Map()
    this.abi.data.forEach(member => {
      switch (member.get('type')) {
        case 'function':
          if (
            member.get('stateMutability') === 'view' ||
            member.get('stateMutability') === 'pure'
          ) {
            let methodName = member.get('name')
            let currentCount = generatedMethods.get(methodName)
            if (currentCount === undefined) {
              generatedMethods.set(methodName, 1)
            } else {
              generatedMethods.set(methodName, currentCount + 1)
              methodName += currentCount
            }
            
            // Generate a type for the result of calling the function
            let returnType = undefined
            let simpleReturnType = true
            if (member.get('outputs').size > 1) {
              simpleReturnType = false

              // Create a type dedicated to holding the return values
              returnType = tsCodegen.klass(
                this.abi.name + '__' + methodName + 'Result',
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
                methodName,
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
      inputType == 'tuple' ||
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
