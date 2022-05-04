const immutable = require('immutable')
const fs = require('fs')
const yaml = require('yaml')
const request = require('sync-request')
const Web3EthAbi = require('web3-eth-abi');

const tsCodegen = require('../../../codegen/typescript')
const typesCodegen = require('../../../codegen/types')
const util = require('../../../codegen/util')

const doFixtureCodegen = fs.existsSync('./fixtures.yaml');

module.exports = class AbiCodeGenerator {
  constructor(abi) {
    this.abi = abi
  }

  generateModuleImports() {
    let imports = [
      tsCodegen.moduleImports(
        [
          // Ethereum integration
          'ethereum',

          // Base classes
          'JSONValue',
          'TypedMap',
          'Entity',

          // AssemblyScript types
          'Bytes',
          'Address',
          'BigInt',
        ],
        '@graphprotocol/graph-ts',
      )
    ]

    if (doFixtureCodegen) {
      imports.push(
        tsCodegen.moduleImports(
          [
            'newMockEvent',
          ],
          'matchstick-as/assembly/index',
        )
      )
    }

    return imports
  }

  generateTypes() {
    return [
      ...this._generateEventTypes(),
      ...this._generateSmartContractClass(),
      ...this._generateCallTypes(),
    ]
  }

  _generateCallTypes() {
    let callFunctions = util.disambiguateNames({
      values: this.abi.callFunctions(),
      getName: fn =>
        fn.get('name') || (fn.get('type') === 'constructor' ? 'constructor' : 'default'),
      setName: (fn, name) => fn.set('_alias', name),
    })

    callFunctions = callFunctions
      .map(fn => {
        let fnAlias = fn.get('_alias')
        let fnClassName = `${fnAlias.charAt(0).toUpperCase()}${fnAlias.slice(1)}Call`
        let tupleClasses = []

        // First, generate a class with the input getters
        let inputsClassName = fnClassName + '__Inputs'
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
        util
          .disambiguateNames({
            values: fn.get('inputs', immutable.List()),
            getName: (input, index) => input.get('name') || `value${index}`,
            setName: (input, name) => input.set('name', name),
          })
          .forEach((input, index) => {
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
        let outputsClassName = fnClassName + '__Outputs'
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
        util
          .disambiguateNames({
            values: fn.get('outputs', immutable.List()),
            getName: (output, index) => output.get('name') || `value${index}`,
            setName: (output, name) => output.set('name', name),
          })
          .forEach((output, index) => {
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
          extends: 'ethereum.Call',
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

    return callFunctions
      .reduce(
        // flatten the array
        (array, classes) => array.concat(classes),
        [],
      )
  }

  _generateEventTypes() {
    // Enumerate events with duplicate names
    let events = util.disambiguateNames({
      values: this.abi.data.filter(member => member.get('type') === 'event'),
      getName: event => event.get('name'),
      setName: (event, name) => event.set('_alias', name),
    })

    events = events
      .map(event => {
        let eventClassName = event.get('_alias')
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

        // Enumerate inputs with duplicate names
        let inputs = util.disambiguateNames({
          values: event.get('inputs'),
          getName: (input, index) => input.get('name') || `param${index}`,
          setName: (input, name) => input.set('name', name),
        })

        let namesAndTypes = []
        inputs.forEach((input, index) => {
          // Generate getters and classes for event params
          let paramObject = this._generateInputOrOutput(
            input,
            index,
            eventClassName,
            `event`,
            `parameters`,
          )
          paramsClass.addMethod(paramObject.getter)

          // Fixture generation
          if (doFixtureCodegen) {
            let ethType = typesCodegen.ethereumTypeForAsc(paramObject.getter.returnType)
            if (typeof ethType === typeof {} && (ethType.test("int256") || ethType.test("uint256"))) {
              ethType = "int32"
            }
            namesAndTypes.push({name: paramObject.getter.name.slice(4), type: ethType})
          }

          tupleClasses.push(...paramObject.classes)
        })

        // Then, generate the event class itself
        let klass = tsCodegen.klass(eventClassName, {
          export: true,
          extends: 'ethereum.Event',
        })
        klass.addMethod(
          tsCodegen.method(
            `get params`,
            [],
            tsCodegen.namedType(paramsClassName),
            `return new ${paramsClassName}(this)`,
          ),
        )

        // Fixture generation
        if (doFixtureCodegen) {
          const args = yaml.parse(fs.readFileSync('./fixtures.yaml', 'utf8'))
          const blockNumber = args['blockNumber']
          const contractAddr = args['contractAddr']
          const topic0 = args['topic0']
          const apiKey = args['apiKey']
          const url = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${blockNumber}&toBlock=${blockNumber}&address=${contractAddr}&${topic0}=topic0&apikey=${apiKey}`;

          let resp = request("GET", url)
          let body = JSON.parse(resp.getBody("utf8"))
          if (body.status === '0') {
            throw new Error(body.result)
          }

          let res = Web3EthAbi.decodeLog(
            namesAndTypes,
            body.result[0].data,
            []
          );

          let stmnts = ""
          for (let i = 0; i < namesAndTypes.length; i++) {
            let code = '"' + res[i] + '"'
            if (namesAndTypes[i].type.toString() == "address") {
              code = `Address.fromString(${code})`
            }
            stmnts = stmnts.concat(`event.parameters.push(new ethereum.EventParam(\"${namesAndTypes[i].name}\", ${typesCodegen.ethereumFromAsc(code, namesAndTypes[i].type)}));`, `\n`)
          }

          klass.addMethod(
            tsCodegen.staticMethod(
              `mock${eventClassName}`,
              [],
              tsCodegen.namedType(eventClassName),
              `
              let event = changetype<${eventClassName}>(newMockEvent());
              ${stmnts}
              return event;
              `,
            )
          )
        }

        return [klass, paramsClass, ...tupleClasses]
      })

    return events
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

    // Generate getters and classes for the param (classes only created for Ethereum tuple types)
    return util.containsTupleType(valueType)
      ? this._generateTupleType(
          inputOrOutput,
          index,
          parentClass,
          parentType,
          parentField,
        )
      : {
          name: [],
          getter: tsCodegen.method(
            `get ${name}`,
            [],
            typesCodegen.ascTypeForEthereum(valueType),
            `
            return ${typesCodegen.ethereumToAsc(
              util.isTupleType(parentType)
                ? `this[${index}]`
                : `this._${parentType}.${parentField}[${index}].value`,
              valueType,
            )}
            `,
          ),
          classes: [],
        }
  }

  _tupleTypeName(inputOrOutput, index, parentClass, parentType) {
    return this._generateTupleType(inputOrOutput, index, parentClass, parentType, '').name
  }

  _generateTupleType(inputOrOutput, index, parentClass, parentType, parentField) {
    let type = inputOrOutput.get('type')
    let name = inputOrOutput.get('name')
    if (name === undefined || name === null || name === '') {
      name = parentType === 'event' ? `param${index}` : `value${index}`
    }

    let tupleIdentifier = parentClass + tsCodegen.namedType(name).capitalize()
    let tupleClassName = tupleIdentifier + 'Struct'
    let tupleClasses = []

    let isTupleType = util.isTupleType(type)
    let returnValue = typesCodegen.ethereumToAsc(
      parentType === 'tuple'
        ? `this[${index}]`
        : `this._${parentType}.${parentField}[${index}].value`,
      type,
      tupleClassName,
    )

    // Generate getter for parent class
    let tupleGetter = tsCodegen.method(
      `get ${name}`,
      [],
      util.isTupleArrayType(type) ? `Array<${tupleClassName}>` : tupleClassName,
      `
      return ${
        isTupleType ? `changetype<${tupleClassName}>(${returnValue})` : `${returnValue}`
      }
      `,
    )

    // Generate tuple class
    let baseTupleClass = tsCodegen.klass(tupleClassName, {
      export: true,
      extends: 'ethereum.Tuple',
    })

    // Add param getters to tuple class and generate classes for each tuple parameter
    inputOrOutput.get('components').forEach((component, index) => {
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
      name: tupleClassName,
      getter: tupleGetter,
      classes: tupleClasses,
    }
  }

  _generateSmartContractClass() {
    let klass = tsCodegen.klass(this.abi.name, {
      export: true,
      extends: 'ethereum.SmartContract',
    })
    let types = immutable.List()

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

    // Get view/pure functions from the contract
    let functions = this.callableFunctions()

    // Disambiguate functions with duplicate names
    functions = util.disambiguateNames({
      values: functions,
      getName: fn => fn.get('name'),
      setName: (fn, name) => fn.set('_alias', name),
    })

    functions.forEach(member => {
      let fnName = member.get('name')
      let fnAlias = member.get('_alias')
      let fnSignature = this.abi.functionSignature(member)

      // Generate a type for the result of calling the function
      let returnType = undefined
      let simpleReturnType = true
      let tupleResultParentType = this.abi.name + '__' + fnAlias + 'Result'

      // Disambiguate outputs with duplicate names
      let outputs = util.disambiguateNames({
        values: member.get('outputs', immutable.List()),
        getName: (input, index) => input.get('name') || `value${index}`,
        setName: (input, name) => input.set('name', name),
      })

      if (member.get('outputs', immutable.List()).size > 1) {
        simpleReturnType = false

        // Create a type dedicated to holding the return values
        returnType = tsCodegen.klass(this.abi.name + '__' + fnAlias + 'Result', {
          export: true,
        })

        // Add a constructor to this type
        returnType.addMethod(
          tsCodegen.method(
            'constructor',
            outputs.map((output, index) =>
              tsCodegen.param(
                `value${index}`,
                this._getTupleParamType(output, index, tupleResultParentType),
              ),
            ),
            null,
            outputs
              .map((output, index) => `this.value${index} = value${index}`)
              .join('\n'),
          ),
        )

        // Add a `toMap(): TypedMap<string,ethereum.Value>` function to the return type
        returnType.addMethod(
          tsCodegen.method(
            'toMap',
            [],
            tsCodegen.namedType('TypedMap<string,ethereum.Value>'),
            `
            let map = new TypedMap<string,ethereum.Value>();
            ${outputs
              .map(
                (output, index) =>
                  `map.set('value${index}', ${typesCodegen.ethereumFromAsc(
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
        outputs
          .map((output, index) =>
            tsCodegen.klassMember(
              `value${index}`,
              this._getTupleParamType(output, index, tupleResultParentType),
            ),
          )
          .forEach(member => returnType.addMember(member))

        // Create types for Tuple outputs
        outputs.forEach((output, index) => {
          if (util.containsTupleType(output.get('type'))) {
            types = types.concat(
              this._generateTupleType(
                output,
                index,
                tupleResultParentType,
                'function',
                this.abi.name,
              ).classes,
            )
          }
        })

        // Add the type to the types we'll create
        types = types.push(returnType)

        returnType = tsCodegen.namedType(returnType.name)
      } else {
        let type = outputs.get(0).get('type')
        if (util.containsTupleType(type)) {
          // Add the Tuple type to the types we'll create
          let tuple = this._generateTupleType(
            outputs.get(0),
            0,
            tupleResultParentType,
            'function',
            this.abi.name,
          )
          types = types.concat(tuple.classes)
          returnType = util.isTupleType(type)
            ? tsCodegen.namedType(tuple.name)
            : `Array<${tsCodegen.namedType(tuple.name)}>`
        } else {
          returnType = tsCodegen.namedType(typesCodegen.ascTypeForEthereum(type))
        }
      }

      // Disambiguate inputs with duplicate names
      let inputs = util.disambiguateNames({
        values: member.get('inputs', immutable.List()),
        getName: (input, index) => input.get('name') || `param${index}`,
        setName: (input, name) => input.set('name', name),
      })

      // Generate a type prefix to identify the Tuple inputs to a function
      let tupleInputParentType = this.abi.name + '__' + fnAlias + 'Input'

      // Create types for Tuple inputs
      inputs.forEach((input, index) => {
        if (util.containsTupleType(input.get('type'))) {
          types = types.concat(
            this._generateTupleType(
              input,
              index,
              tupleInputParentType,
              'function',
              this.abi.name,
            ).classes,
          )
        }
      })

      // Generate and add a method that implements calling the function on
      // the smart contract
      let params = inputs.map((input, index) =>
        tsCodegen.param(
          input.get('name'),
          this._getTupleParamType(input, index, tupleInputParentType),
        ),
      )

      let superInputs = `
      '${fnName}',
      '${fnSignature}',
      [${
        inputs.size > 0
          ? inputs
              .map(input =>
                typesCodegen.ethereumFromAsc(input.get('name'), input.get('type')),
              )
              .map(coercion => coercion.toString())
              .join(', ')
          : ''
      }]`

      let methodCallBody = isTry => {
        const methodBody = `
        ${
          isTry
            ? `
        let result = super.tryCall(${superInputs})
        if (result.reverted) {
          return new ethereum.CallResult()
        }
        let value = result.value
        return ethereum.CallResult.fromValue(`
            : `
        let result = super.call(${superInputs})

        return (`
        }`

        const returnVal = simpleReturnType
          ? typesCodegen.ethereumToAsc(
              isTry ? 'value[0]' : 'result[0]',
              outputs.get(0).get('type'),
              util.isTupleArrayType(outputs.get(0).get('type'))
                ? this._tupleTypeName(
                    outputs.get(0),
                    0,
                    tupleResultParentType,
                    this.abi.name,
                  )
                : '',
            )
          : `new ${returnType.name}(
                ${outputs
                  .map((output, index) => {
                    const val = typesCodegen.ethereumToAsc(
                      isTry ? `value[${index}]` : `result[${index}]`,
                      output.get('type'),
                      util.isTupleArrayType(output.get('type'))
                        ? this._tupleTypeName(
                            output,
                            index,
                            tupleResultParentType,
                            this.abi.name,
                          )
                        : '',
                    )
                    return util.isTupleType(output.get('type'))
                      ? `changetype<${this._tupleTypeName(
                          output,
                          index,
                          tupleResultParentType,
                          this.abi.name,
                        )}>(${val})`
                      : val
                  })
                  .join(', ')}
              )`

        const isTuple = util.isTupleType(outputs.get(0).get('type'))
        return `${methodBody} ${
          isTuple ? `changetype<${returnType}>(${returnVal})` : returnVal
        })`
      }

      // Generate method with an without `try_`.
      klass.addMethod(
        tsCodegen.method(fnAlias, params, returnType, methodCallBody(false)),
      )
      klass.addMethod(
        tsCodegen.method(
          'try_' + fnAlias,
          params,
          'ethereum.CallResult<' + returnType + '>',
          methodCallBody(true),
        ),
      )
    })

    return [...types, klass]
  }

  _getTupleParamType(inputOrOutput, index, tupleParentType) {
    const type = inputOrOutput.get('type')
    return util.isTupleType(type)
      ? this._tupleTypeName(inputOrOutput, index, tupleParentType, this.abi.name)
      : util.isTupleArrayType(type)
      ? `Array<${this._tupleTypeName(
          inputOrOutput,
          index,
          tupleParentType,
          this.abi.name,
        )}>`
      : typesCodegen.ascTypeForEthereum(type)
  }

  _indexedInputType(inputType) {
    // strings, bytes and arrays are encoded and hashed to a bytes32 value
    if (
      inputType === 'string' ||
      inputType === 'bytes' ||
      inputType === 'tuple' ||
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

  callableFunctions() {
    let allowedMutability = ['view', 'pure', 'nonpayable', 'constant']
    return this.abi.data.filter(
      member =>
        member.get('type') === 'function' &&
        member.get('outputs', immutable.List()).size !== 0 &&
        (allowedMutability.includes(member.get('stateMutability')) ||
          (member.get('stateMutability') === undefined && !member.get('payable', false))),
    )
  }
}
