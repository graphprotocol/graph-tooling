/* eslint-disable unicorn/no-array-for-each */
import fs from 'fs';
import immutable from 'immutable';
import request from 'sync-request';
import Web3EthAbi from 'web3-eth-abi';
import yaml from 'yaml';
import * as typesCodegen from '../../../codegen/types';
import * as tsCodegen from '../../../codegen/typescript';
import * as util from '../../../codegen/util';
import ABI from '../abi';

const doFixtureCodegen = fs.existsSync('./fixtures.yaml');

export default class AbiCodeGenerator {
  constructor(private abi: ABI) {
    this.abi = abi;
    // Sanitize the name of the ABI to make it a valid class name
    this.abi.name = abi.name.replace(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/g, '_');
  }

  generateModuleImports() {
    const imports = [
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
      ),
    ];

    if (doFixtureCodegen) {
      imports.push(tsCodegen.moduleImports(['newMockEvent'], 'matchstick-as/assembly/index'));
    }

    return imports;
  }

  generateTypes() {
    return [
      ...this._generateEventTypes(),
      ...this._generateSmartContractClass(),
      ...this._generateCallTypes(),
    ];
  }

  _generateCallTypes() {
    let callFunctions = util.disambiguateNames({
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      values: this.abi.callFunctions(),
      getName: fn =>
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        fn.get('name') || (fn.get('type') === 'constructor' ? 'constructor' : 'default'),
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      setName: (fn, name) => fn.set('_alias', name),
    }) as any[];

    callFunctions = callFunctions.map(fn => {
      const fnAlias = fn.get('_alias');
      const fnClassName = `${fnAlias.charAt(0).toUpperCase()}${fnAlias.slice(1)}Call`;
      const tupleClasses: any[] = [];

      // First, generate a class with the input getters
      const inputsClassName = fnClassName + '__Inputs';
      const inputsClass = tsCodegen.klass(inputsClassName, { export: true });
      inputsClass.addMember(tsCodegen.klassMember('_call', fnClassName));
      inputsClass.addMethod(
        tsCodegen.method(
          `constructor`,
          [tsCodegen.param(`call`, fnClassName)],
          null,
          `this._call = call`,
        ),
      );

      // Generate getters and classes for function inputs
      util
        .disambiguateNames({
          values: fn.get('inputs', immutable.List()),
          // @ts-expect-error improve typings of disambiguateNames to handle iterables
          getName: (input, index) => input.get('name') || `value${index}`,
          // @ts-expect-error improve typings of disambiguateNames to handle iterables
          setName: (input, name) => input.set('name', name),
        })
        .forEach((input: any, index) => {
          const callInput = this._generateInputOrOutput(
            input,
            index,
            fnClassName,
            `call`,
            `inputValues`,
          );
          inputsClass.addMethod(callInput.getter);
          tupleClasses.push(...callInput.classes);
        });

      // Second, generate a class with the output getters
      const outputsClassName = fnClassName + '__Outputs';
      const outputsClass = tsCodegen.klass(outputsClassName, { export: true });
      outputsClass.addMember(tsCodegen.klassMember('_call', fnClassName));
      outputsClass.addMethod(
        tsCodegen.method(
          `constructor`,
          [tsCodegen.param(`call`, fnClassName)],
          null,
          `this._call = call`,
        ),
      );

      // Generate getters and classes for function outputs
      util
        .disambiguateNames({
          values: fn.get('outputs', immutable.List()),
          // @ts-expect-error improve typings of disambiguateNames to handle iterables
          getName: (output, index) => output.get('name') || `value${index}`,
          // @ts-expect-error improve typings of disambiguateNames to handle iterables
          setName: (output, name) => output.set('name', name),
        })
        .forEach((output: any, index) => {
          const callInput = this._generateInputOrOutput(
            output,
            index,
            fnClassName,
            `call`,
            `outputValues`,
          );
          outputsClass.addMethod(callInput.getter);
          tupleClasses.push(...callInput.classes);
        });

      // Then, generate the event class itself
      const klass = tsCodegen.klass(fnClassName, {
        export: true,
        extends: 'ethereum.Call',
      });
      klass.addMethod(
        tsCodegen.method(
          `get inputs`,
          [],
          tsCodegen.namedType(inputsClassName),
          `return new ${inputsClassName}(this)`,
        ),
      );
      klass.addMethod(
        tsCodegen.method(
          `get outputs`,
          [],
          tsCodegen.namedType(outputsClassName),
          `return new ${outputsClassName}(this)`,
        ),
      );
      return [klass, inputsClass, outputsClass, ...tupleClasses];
    });

    return callFunctions.reduce(
      // flatten the array
      (array, classes) => array.concat(classes),
      [],
    );
  }

  _generateEventTypes() {
    // Enumerate events with duplicate names
    let events = util.disambiguateNames({
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      values: this.abi.data.filter(member => member.get('type') === 'event'),
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      getName: event => event.get('name'),
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      setName: (event, name) => event.set('_alias', name),
    }) as any[];

    events = events.map(event => {
      const eventClassName = event.get('_alias');
      const tupleClasses: any[] = [];

      // First, generate a class with the param getters
      const paramsClassName = eventClassName + '__Params';
      const paramsClass = tsCodegen.klass(paramsClassName, { export: true });
      paramsClass.addMember(tsCodegen.klassMember('_event', eventClassName));
      paramsClass.addMethod(
        tsCodegen.method(
          `constructor`,
          [tsCodegen.param(`event`, eventClassName)],
          null,
          `this._event = event`,
        ),
      );

      // Enumerate inputs with duplicate names
      const inputs = util.disambiguateNames({
        values: event.get('inputs'),
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        getName: (input, index) => input.get('name') || `param${index}`,
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        setName: (input, name) => input.set('name', name),
      }) as any[];

      const namesAndTypes: any[] = [];
      for (const [index, input] of inputs.entries()) {
        // Generate getters and classes for event params
        const paramObject = this._generateInputOrOutput(
          input,
          index,
          eventClassName,
          `event`,
          `parameters`,
        );
        paramsClass.addMethod(paramObject.getter);

        // Fixture generation
        if (doFixtureCodegen) {
          let ethType = typesCodegen.ethereumTypeForAsc(String(paramObject.getter.returnType));
          if (typeof ethType !== 'string' && (ethType.test('int256') || ethType.test('uint256'))) {
            ethType = 'int32';
          }
          namesAndTypes.push({ name: paramObject.getter.name.slice(4), type: ethType });
        }

        tupleClasses.push(...paramObject.classes);
      }

      // Then, generate the event class itself
      const klass = tsCodegen.klass(eventClassName, {
        export: true,
        extends: 'ethereum.Event',
      });
      klass.addMethod(
        tsCodegen.method(
          `get params`,
          [],
          tsCodegen.namedType(paramsClassName),
          `return new ${paramsClassName}(this)`,
        ),
      );

      // Fixture generation
      if (doFixtureCodegen) {
        const args = yaml.parse(fs.readFileSync('./fixtures.yaml', 'utf8'));
        const blockNumber = args['blockNumber'];
        const contractAddr = args['contractAddr'];
        const topic0 = args['topic0'];
        const apiKey = args['apiKey'];
        const url = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${blockNumber}&toBlock=${blockNumber}&address=${contractAddr}&${topic0}=topic0&apikey=${apiKey}`;

        const resp = request('GET', url);
        const body = JSON.parse(resp.getBody('utf8'));
        if (body.status === '0') {
          throw new Error(body.result);
        }

        const res = Web3EthAbi
          // @ts-expect-error decodeLog seems to exist on Web3EthAbi
          .decodeLog(namesAndTypes, body.result[0].data, []);

        let stmnts = '';
        for (let i = 0; i < namesAndTypes.length; i++) {
          let code = '"' + res[i] + '"';
          if (namesAndTypes[i].type.toString() == 'address') {
            code = `Address.fromString(${code})`;
          }
          stmnts = stmnts.concat(
            `event.parameters.push(new ethereum.EventParam("${
              namesAndTypes[i].name
            }", ${typesCodegen.ethereumFromAsc(code, namesAndTypes[i].type)}));`,
            `\n`,
          );
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
          ),
        );
      }

      return [klass, paramsClass, ...tupleClasses];
    });

    return events.reduce(
      // flatten the array
      (array, classes) => array.concat(classes),
      [],
    );
  }

  _generateInputOrOutput(
    inputOrOutput: immutable.Map<any, any>,
    index: number,
    parentClass: string,
    parentType: string,
    parentField?: string,
  ) {
    // Get name and type of the param, adjusting for indexed params and missing names
    let name = inputOrOutput.get('name');
    const valueType =
      parentType === 'event' && inputOrOutput.get('indexed')
        ? this._indexedInputType(inputOrOutput.get('type'))
        : inputOrOutput.get('type');

    if (name === undefined || name === null || name === '') {
      name = parentType === 'event' ? `param${index}` : `value${index}`;
    }

    // Generate getters and classes for the param (classes only created for Ethereum tuple types)
    return util.containsTupleType(valueType)
      ? this._generateTupleType(inputOrOutput, index, parentClass, parentType, parentField)
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
        };
  }

  _tupleTypeName(inputOrOutput: any, index: number, parentClass: string, parentType: string) {
    return this._generateTupleType(inputOrOutput, index, parentClass, parentType, '').name;
  }

  _generateTupleType(
    inputOrOutput: any,
    index: number,
    parentClass: string,
    parentType: string,
    parentField?: string,
  ) {
    const type = inputOrOutput.get('type');
    let name = inputOrOutput.get('name');
    if (name === undefined || name === null || name === '') {
      name = parentType === 'event' ? `param${index}` : `value${index}`;
    }

    const tupleIdentifier = parentClass + tsCodegen.namedType(name).capitalize();
    const tupleClassName = tupleIdentifier + 'Struct';
    let tupleClasses: any[] = [];

    const isTupleType = util.isTupleType(type);
    const returnValue = typesCodegen.ethereumToAsc(
      parentType === 'tuple'
        ? `this[${index}]`
        : `this._${parentType}.${parentField}[${index}].value`,
      type,
      tupleClassName,
    );

    // Generate getter for parent class
    const tupleGetter = tsCodegen.method(
      `get ${name}`,
      [],
      util.isTupleMatrixType(type)
        ? `Array<Array<${tupleClassName}>>`
        : util.isTupleArrayType(type)
        ? `Array<${tupleClassName}>`
        : tupleClassName,
      `
      return ${isTupleType ? `changetype<${tupleClassName}>(${returnValue})` : String(returnValue)}
      `,
    );

    // Generate tuple class
    const baseTupleClass = tsCodegen.klass(tupleClassName, {
      export: true,
      extends: 'ethereum.Tuple',
    });

    // Add param getters to tuple class and generate classes for each tuple parameter
    inputOrOutput.get('components').forEach((component: any, index: number) => {
      const paramObject = this._generateInputOrOutput(component, index, tupleIdentifier, `tuple`);
      baseTupleClass.addMethod(paramObject.getter);
      tupleClasses = tupleClasses.concat(paramObject.classes);
    });

    // Combine all tuple classes generated
    tupleClasses.unshift(baseTupleClass);

    return {
      name: tupleClassName,
      getter: tupleGetter,
      classes: tupleClasses,
    };
  }

  _generateSmartContractClass() {
    const klass = tsCodegen.klass(this.abi.name, {
      export: true,
      extends: 'ethereum.SmartContract',
    });
    let types = immutable.List();

    klass.addMethod(
      tsCodegen.staticMethod(
        'bind',
        // TODO: add support for iterable staticMethod params
        immutable.List([
          tsCodegen.param('address', typesCodegen.ascTypeForEthereum('address')),
        ]) as unknown as tsCodegen.Param[],
        tsCodegen.namedType(this.abi.name),
        `
        return new ${this.abi.name}('${this.abi.name}', address);
        `,
      ),
    );

    // Get view/pure functions from the contract
    let functions = this.callableFunctions();

    // Disambiguate functions with duplicate names
    functions = util.disambiguateNames({
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      values: functions,
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      getName: fn => fn.get('name'),
      // @ts-expect-error improve typings of disambiguateNames to handle iterables
      setName: (fn, name) => fn.set('_alias', name),
    }) as any;

    for (const member of functions) {
      const fnName = (member as any).get('name');
      const fnAlias = (member as any).get('_alias');
      const fnSignature = this.abi.functionSignature(member as any);

      // Generate a type for the result of calling the function
      let returnType: any = undefined;
      let simpleReturnType = true;
      const tupleResultParentType = this.abi.name + '__' + fnAlias + 'Result';

      // Disambiguate outputs with duplicate names
      const outputs = util.disambiguateNames({
        values: (member as any).get('outputs', immutable.List()),
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        getName: (input, index) => input.get('name') || `value${index}`,
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        setName: (input, name) => input.set('name', name),
      }) as any;

      if ((member as any).get('outputs', immutable.List()).size > 1) {
        simpleReturnType = false;

        // Create a type dedicated to holding the return values
        returnType = tsCodegen.klass(this.abi.name + '__' + fnAlias + 'Result', {
          export: true,
        });

        // Add a constructor to this type
        returnType.addMethod(
          tsCodegen.method(
            'constructor',
            outputs.map((output: any, index: number) =>
              tsCodegen.param(
                `value${index}`,
                this._getTupleParamType(output, index, tupleResultParentType),
              ),
            ),
            null,
            outputs
              .map((_output: any, index: number) => `this.value${index} = value${index}`)
              .join('\n'),
          ),
        );

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
                (output: any, index: number) =>
                  `map.set('value${index}', ${typesCodegen.ethereumFromAsc(
                    `this.value${index}`,
                    output.get('type'),
                  )})`,
              )
              .join(';')}
            return map;
            `,
          ),
        );

        // Add value0, value1 etc. members to the type
        outputs
          .map((output: any, index: number) =>
            tsCodegen.klassMember(
              `value${index}`,
              this._getTupleParamType(output, index, tupleResultParentType),
            ),
          )
          .forEach((member: any) => returnType.addMember(member));

        // Add getters to the type
        outputs
          .map(
            (output: any, index: number) =>
              !!output.get('name') &&
              tsCodegen.method(
                `get${output.get('name')[0].toUpperCase()}${output.get('name').slice(1)}`,
                [],
                this._getTupleParamType(output, index, tupleResultParentType),
                `return this.value${index};`,
              ),
          )
          .forEach((method: any) => !!method && returnType.addMethod(method));

        // Create types for Tuple outputs
        outputs.forEach((output: any, index: number) => {
          if (util.containsTupleType(output.get('type'))) {
            types = types.concat(
              this._generateTupleType(
                output,
                index,
                tupleResultParentType,
                'function',
                this.abi.name,
              ).classes,
            );
          }
        });

        // Add the type to the types we'll create
        types = types.push(returnType);

        returnType = tsCodegen.namedType(returnType.name);
      } else {
        const type = outputs.get(0).get('type');
        if (util.containsTupleType(type)) {
          // Add the Tuple type to the types we'll create
          const tuple = this._generateTupleType(
            outputs.get(0),
            0,
            tupleResultParentType,
            'function',
            this.abi.name,
          );
          types = types.concat(tuple.classes);
          returnType = util.isTupleType(type)
            ? tsCodegen.namedType(tuple.name)
            : `Array<${tsCodegen.namedType(tuple.name)}>`;
        } else {
          returnType = tsCodegen.namedType(typesCodegen.ascTypeForEthereum(type));
        }
      }

      // Disambiguate inputs with duplicate names
      const inputs = util.disambiguateNames({
        values: (member as any).get('inputs', immutable.List()),
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        getName: (input, index) => input.get('name') || `param${index}`,
        // @ts-expect-error improve typings of disambiguateNames to handle iterables
        setName: (input, name) => input.set('name', name),
      }) as any;

      // Generate a type prefix to identify the Tuple inputs to a function
      const tupleInputParentType = this.abi.name + '__' + fnAlias + 'Input';

      // Create types for Tuple inputs
      inputs.forEach((input: any, index: number) => {
        if (util.containsTupleType(input.get('type'))) {
          types = types.concat(
            this._generateTupleType(input, index, tupleInputParentType, 'function', this.abi.name)
              .classes,
          );
        }
      });

      // Generate and add a method that implements calling the function on
      // the smart contract
      const params = inputs.map((input: any, index: number) =>
        tsCodegen.param(
          input.get('name'),
          this._getTupleParamType(input, index, tupleInputParentType),
        ),
      );

      const superInputs = `
      '${fnName}',
      '${fnSignature}',
      [${
        inputs.size > 0
          ? inputs
              .map((input: any) =>
                typesCodegen.ethereumFromAsc(input.get('name'), input.get('type')),
              )
              .map((coercion: any) => coercion.toString())
              .join(', ')
          : ''
      }]`;

      const methodCallBody = (isTry: boolean) => {
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
        }`;

        const returnVal = simpleReturnType
          ? typesCodegen.ethereumToAsc(
              isTry ? 'value[0]' : 'result[0]',
              outputs.get(0).get('type'),
              util.isTupleArrayType(outputs.get(0).get('type'))
                ? this._tupleTypeName(outputs.get(0), 0, tupleResultParentType, this.abi.name)
                : '',
            )
          : `new ${returnType.name}(
                ${outputs
                  .map((output: any, index: number) => {
                    const val = typesCodegen.ethereumToAsc(
                      isTry ? `value[${index}]` : `result[${index}]`,
                      output.get('type'),
                      util.isTupleArrayType(output.get('type'))
                        ? this._tupleTypeName(output, index, tupleResultParentType, this.abi.name)
                        : '',
                    );
                    return util.isTupleType(output.get('type'))
                      ? `changetype<${this._tupleTypeName(
                          output,
                          index,
                          tupleResultParentType,
                          this.abi.name,
                        )}>(${val})`
                      : val;
                  })
                  .join(', ')}
              )`;

        const isTuple = util.isTupleType(outputs.get(0).get('type'));
        return `${methodBody} ${isTuple ? `changetype<${returnType}>(${returnVal})` : returnVal})`;
      };

      // Generate method with an without `try_`.
      klass.addMethod(tsCodegen.method(fnAlias, params, returnType, methodCallBody(false)));
      klass.addMethod(
        tsCodegen.method(
          'try_' + fnAlias,
          params,
          'ethereum.CallResult<' + returnType + '>',
          methodCallBody(true),
        ),
      );
    }

    return [...types, klass];
  }

  _getTupleParamType(inputOrOutput: any, index: number, tupleParentType: string) {
    const type = inputOrOutput.get('type');
    return util.isTupleType(type)
      ? this._tupleTypeName(inputOrOutput, index, tupleParentType, this.abi.name)
      : util.isTupleMatrixType(type)
      ? `Array<Array<${this._tupleTypeName(inputOrOutput, index, tupleParentType, this.abi.name)}>>`
      : util.isTupleArrayType(type)
      ? `Array<${this._tupleTypeName(inputOrOutput, index, tupleParentType, this.abi.name)}>`
      : typesCodegen.ascTypeForEthereum(type);
  }

  _indexedInputType(inputType: string) {
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
      return 'bytes32';
    }
    return inputType;
  }

  callableFunctions() {
    const allowedMutability = ['view', 'pure', 'nonpayable', 'constant'];
    return this.abi.data.filter(
      member =>
        member.get('type') === 'function' &&
        member.get('outputs', immutable.List()).size !== 0 &&
        (allowedMutability.includes(member.get('stateMutability')) ||
          (member.get('stateMutability') === undefined && !member.get('payable', false))),
    );
  }
}
