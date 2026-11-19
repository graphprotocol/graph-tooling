import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ascTypeForEthereum, ethereumFromAsc } from './index.js';

const require = createRequire(import.meta.url);
const compiler = path.dirname(require.resolve('assemblyscript'));
const sdk = fileURLToPath(new URL('../../../../ts/', import.meta.url));
const run = promisify(execFile);

// The numbers are the graph-ts Ethereum ValueKind ABI discriminants.
const cases = [
  { type: 'bool[2]', input: '[true, false]', kinds: [7, 5] },
  { type: 'bool[2][]', input: '[[true, false]]', kinds: [8, 7, 5] },
  { type: 'bool[][2]', input: '[[true], [false]]', kinds: [7, 8, 5] },
  { type: 'bool[2][2]', input: '[[true, false], [false, true]]', kinds: [7, 7, 5] },
  { type: 'bool[][]', input: '[[true]]', kinds: [8, 8, 5] },
  { type: 'int8[2]', input: '[-1, 1]', kinds: [7, 3] },
  { type: 'uint8[2]', input: '[0, 255]', kinds: [7, 4] },
  { type: 'uint8[]', input: '[0, 255]', kinds: [8, 4] },
  { type: 'uint24[][]', input: '[[0, 16777215]]', kinds: [8, 8, 4] },
  { type: 'uint256[2]', input: '[BigInt.fromI32(1), BigInt.fromI32(2)]', kinds: [7, 4] },
  { type: 'string[2]', input: '["a", "b"]', kinds: [7, 6] },
  { type: 'bytes[1]', input: '[new Bytes(2)]', kinds: [7, 2] },
  { type: 'bytes32[1]', input: '[new Bytes(32)]', kinds: [7, 1] },
  { type: 'address[1]', input: '[new Address(20)]', kinds: [7, 0] },
  { type: 'tuple[1]', input: '[new InputTuple()]', kinds: [7, 9], ascType: 'Array<InputTuple>' },
  { type: 'address[]', input: '[new Address(20)]', kinds: [8, 0] },
];

const valueProbes = [
  { index: 5, path: '.toArray()[0].toI32()', expected: -1 },
  { index: 6, path: '.toArray()[1].toI32()', expected: 255 },
  { index: 8, path: '.toArray()[0].toArray()[1].toI32()', expected: 16_777_215 },
];

describe('generated Ethereum array values', () => {
  let directory: string;
  let exports: WebAssembly.Exports;

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-array-values-'));
    const modules = path.join(directory, 'node_modules', '@graphprotocol');
    fs.mkdirSync(modules, { recursive: true });
    fs.symlinkSync(sdk, path.join(modules, 'graph-ts'), 'dir');
    const functions = cases.map((item, index) => {
      let current = 'value';
      let shape = `${current}.kind`;
      for (let depth = 1; depth < item.kinds.length; depth++) {
        current += '.toArray()[0]';
        shape = `(${shape}) * 16 + ${current}.kind`;
      }
      const declarations = `const input: ${item.ascType ?? ascTypeForEthereum(item.type)} = ${item.input};
        const value = ${ethereumFromAsc('input', item.type)};
      `;
      const probe = valueProbes.find(probe => probe.index === index);
      return `export function case${index}(): i32 {
        ${declarations}
        return ${shape};
      }
      ${probe ? `export function probe${index}(): i32 { ${declarations} return value${probe.path}; }` : ''}`;
    });
    const entry = path.join(directory, 'index.ts');
    const output = path.join(directory, 'mapping.wasm');
    fs.writeFileSync(
      entry,
      `import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
      class InputTuple extends ethereum.Tuple {}
      ${functions.join('\n')}`,
    );
    await run(
      process.execPath,
      [
        path.join(compiler, 'bin/asc'),
        entry,
        path.join(sdk, 'global/global.ts'),
        '--baseDir',
        directory,
        '--lib',
        path.join(directory, 'node_modules'),
        '--runtime',
        'stub',
        '--outFile',
        output,
      ],
      { cwd: directory },
    );
    const module = new WebAssembly.Module(fs.readFileSync(output));
    exports = new WebAssembly.Instance(module, {
      env: {
        abort: () => {
          throw new Error('AssemblyScript abort');
        },
      },
      conversion: {
        // Required by the overflow diagnostic path in ByteArray.toI32.
        'typeConversion.bytesToHex': () => {
          throw new Error('Unexpected integer overflow in generated array value');
        },
      },
    }).exports;
  }, 15_000);

  afterAll(() => {
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it.each(cases)('preserves the runtime value kinds for $type', item => {
    const index = cases.indexOf(item);
    const evaluate = exports[`case${index}`] as () => number;
    expect(evaluate()).toBe(item.kinds.reduce((shape, kind) => shape * 16 + kind));
  });

  it.each(valueProbes)('preserves integer leaf values in case $index', probe => {
    const evaluate = exports[`probe${probe.index}`] as () => number;
    expect(evaluate()).toBe(probe.expected);
  });
});
