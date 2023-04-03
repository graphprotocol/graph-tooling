import path from 'path';
import fs from 'fs-extra';
import immutable from 'immutable';
import AbiCodeGenerator from './codegen/abi';

const TUPLE_ARRAY_PATTERN = /^tuple\[([0-9]*)\]$/;
const TUPLE_MATRIX_PATTERN = /^tuple\[([0-9]*)\]\[([0-9]*)\]$/;

const buildOldSignatureParameter = (input: immutable.Map<any, any>) => {
  return input.get('type') === 'tuple'
    ? `(${input
        .get('components')
        .map((component: any) => buildSignatureParameter(component))
        .join(',')})`
    : String(input.get('type'));
};

const buildSignatureParameter = (input: immutable.Map<any, any>) => {
  if (input.get('type') === 'tuple') {
    return `(${input.get('indexed') ? 'indexed ' : ''}${input
      .get('components')
      .map((component: any) => buildSignatureParameter(component))
      .join(',')})`;
  }
  if (input.get('type').match(TUPLE_ARRAY_PATTERN)) {
    const length = input.get('type').match(TUPLE_ARRAY_PATTERN)[1];
    return `(${input.get('indexed') ? 'indexed ' : ''}${input
      .get('components')
      .map((component: any) => buildSignatureParameter(component))
      .join(',')})[${length || ''}]`;
  }
  if (input.get('type').match(TUPLE_MATRIX_PATTERN)) {
    const length1 = input.get('type').match(TUPLE_MATRIX_PATTERN)[1];
    const length2 = input.get('type').match(TUPLE_MATRIX_PATTERN)[2];
    return `(${input.get('indexed') ? 'indexed ' : ''}${input
      .get('components')
      .map((component: any) => buildSignatureParameter(component))
      .join(',')})[${length1 || ''}][${length2 || ''}]`;
  }
  return `${input.get('indexed') ? 'indexed ' : ''}${input.get('type')}`;
};

export default class ABI {
  constructor(
    public name: string,
    public file: string | undefined,
    public data: immutable.Collection<any, any>,
  ) {
    this.name = name;
    this.file = file;
    this.data = data;
  }

  codeGenerator() {
    return new AbiCodeGenerator(this);
  }

  static oldEventSignature(event: immutable.Map<any, any>) {
    return `${event.get('name')}(${event
      .get('inputs', [])
      .map(buildOldSignatureParameter)
      .join(',')})`;
  }

  static eventSignature(event: immutable.Map<any, any>) {
    return `${event.get('name')}(${event
      .get('inputs', [])
      .map(buildSignatureParameter)
      .join(',')})`;
  }

  /**
   * For the ABI of a function, returns a string function signature compatible
   * with the Rust `ethabi` library. It is of the form
   *
   *     <function>([<input-type-1>, ...])[:(<output-type-1,...)]
   *
   * A few examples for a function called `example`:
   *
   * - No inputs or outputs: `example()`
   * - One input and output: `example(uint256):(bool)`
   * - Multiple inputs and outputs: `example(uint256,(string,bytes32)):(bool,uint256)`
   */
  functionSignature(fn: immutable.Map<any, any>) {
    const inputs = fn.get('inputs', []).map(buildSignatureParameter).join(',');
    const outputs = fn.get('outputs', []).map(buildSignatureParameter).join(',');
    return `${fn.get('name')}(${inputs})${outputs.length > 0 ? `:(${outputs})` : ''}`;
  }

  oldEventSignatures() {
    return this.data
      .filter((entry: any) => entry.get('type') === 'event')
      .map(ABI.oldEventSignature);
  }

  eventSignatures() {
    return this.data.filter((entry: any) => entry.get('type') === 'event').map(ABI.eventSignature);
  }

  callFunctions() {
    // An entry is a function if its type is not set or if it is one of
    // 'constructor', 'function' or 'fallback'
    const functionTypes = immutable.Set(['constructor', 'function', 'fallback']);
    const functions = this.data.filter(
      (entry: any) => !entry.has('type') || functionTypes.includes(entry.get('type')),
    );

    // A function is a call function if it is nonpayable, payable or
    // not constant
    const mutabilityTypes = immutable.Set(['nonpayable', 'payable']);
    return functions.filter(
      (entry: any) =>
        mutabilityTypes.includes(entry.get('stateMutability')) || entry.get('constant') === false,
    );
  }

  callFunctionSignatures() {
    return this.callFunctions()
      .filter((entry: any) => entry.get('type') !== 'constructor')
      .map((entry: any) => {
        const name = entry.get('name', '<default>');
        const inputs = entry
          .get('inputs', immutable.List())
          .map((input: any) => buildSignatureParameter(input));

        return `${name}(${inputs.join(',')})`;
      });
  }

  static normalized(json: any) {
    if (Array.isArray(json)) {
      return json;
    }
    if (json.abi !== undefined) {
      return json.abi;
    }
    if (json.compilerOutput?.abi) {
      return json.compilerOutput.abi;
    }
    return undefined;
  }

  static load(name: string, file: string) {
    const data = JSON.parse(fs.readFileSync(file).toString());
    const abi = ABI.normalized(data);

    if (abi === null || abi === undefined) {
      throw Error(`No valid ABI in file: ${path.relative(process.cwd(), file)}`);
    }

    return new ABI(name, file, immutable.fromJS(abi));
  }
}
