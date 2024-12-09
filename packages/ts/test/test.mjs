// TODO: disabling eslint for now
// We need to re-do this and use TS instead of JS
import fs from 'fs';
import path from 'path';
import { StringDecoder } from 'string_decoder';
import asc from 'assemblyscript/asc';

async function main() {
  // Copy index.ts to a temporary subdirectory so that asc doesn't put all the
  // index.ts exports in the global namespace.
  if (!fs.existsSync('test/temp_lib')) {
    fs.mkdirSync('test/temp_lib');
  }

  if (!fs.existsSync('test/temp_out')) {
    fs.mkdirSync('test/temp_out');
  }

  if (!fs.existsSync('test/temp_lib/chain')) {
    fs.mkdirSync('test/temp_lib/chain');
  }

  if (!fs.existsSync('test/temp_lib/common')) {
    fs.mkdirSync('test/temp_lib/common');
  }

  fs.copyFileSync('common/collections.ts', 'test/temp_lib/common/collections.ts');
  fs.copyFileSync('common/conversion.ts', 'test/temp_lib/common/conversion.ts');
  fs.copyFileSync('common/datasource.ts', 'test/temp_lib/common/datasource.ts');
  fs.copyFileSync('common/json.ts', 'test/temp_lib/common/json.ts');
  fs.copyFileSync('common/numbers.ts', 'test/temp_lib/common/numbers.ts');
  fs.copyFileSync('common/value.ts', 'test/temp_lib/common/value.ts');
  fs.copyFileSync('chain/arweave.ts', 'test/temp_lib/chain/arweave.ts');
  fs.copyFileSync('chain/ethereum.ts', 'test/temp_lib/chain/ethereum.ts');
  fs.copyFileSync('chain/near.ts', 'test/temp_lib/chain/near.ts');
  fs.copyFileSync('chain/cosmos.ts', 'test/temp_lib/chain/cosmos.ts');
  fs.copyFileSync('chain/starknet.ts', 'test/temp_lib/chain/starknet.ts');
  fs.copyFileSync('index.ts', 'test/temp_lib/index.ts');

  try {
    const outputWasmPath = 'test/temp_out/test.wasm';

    for (const file of ['test/bigInt.ts', 'test/bytes.ts', 'test/entity.ts'])
      await testFile(file, outputWasmPath);
  } catch (e) {
    console.error(e);
  } finally {
    fs.unlinkSync('test/temp_lib/common/collections.ts');
    fs.unlinkSync('test/temp_lib/common/conversion.ts');
    fs.unlinkSync('test/temp_lib/common/datasource.ts');
    fs.unlinkSync('test/temp_lib/common/json.ts');
    fs.unlinkSync('test/temp_lib/common/numbers.ts');
    fs.unlinkSync('test/temp_lib/common/value.ts');
    fs.rmdirSync('test/temp_lib/common');
    fs.unlinkSync('test/temp_lib/chain/arweave.ts');
    fs.unlinkSync('test/temp_lib/chain/ethereum.ts');
    fs.unlinkSync('test/temp_lib/chain/near.ts');
    fs.unlinkSync('test/temp_lib/chain/cosmos.ts');
    fs.unlinkSync('test/temp_lib/chain/starknet.ts');
    fs.rmdirSync('test/temp_lib/chain');
    fs.unlinkSync('test/temp_lib/index.ts');
    fs.rmdirSync('test/temp_lib');
    fs.unlinkSync('test/temp_out/test.wasm');
    fs.rmdirSync('test/temp_out');
  }
}

async function testFile(sourceFile, outputWasmPath) {
  console.log(`Compiling test file ${sourceFile} to WASM...`);
  const { error } = await asc.main([
    '--exportRuntime',
    '--importMemory',
    '--runtime',
    'stub',
    sourceFile,
    '--lib',
    'test',
    '-o',
    outputWasmPath,
  ]);

  if (error) throw Error(`Failed to compile: ${sourceFile}`);

  const wasmCode = new Uint8Array(fs.readFileSync(outputWasmPath));
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
  const wasm_module = await WebAssembly.instantiate(wasmCode, {
    env: {
      memory,
      abort(messagePtr, fileNamePtr, lineNumber, columnNumber) {
        const fileSource = path.join(__dirname, '..', sourceFile);
        let message = 'assertion failure';
        if (messagePtr !== 0) {
          message += `: ${getString(memory, messagePtr)}`;
        }

        throw new Error(`${message} (${fileSource}:${lineNumber}:${columnNumber})`);
      },
    },
    conversion: {
      'typeConversion.bytesToHex'() {},
    },
  });

  console.log(`Running "${sourceFile}" tests...`);
  for (const [testName, testFn] of Object.entries(wasm_module.instance.exports)) {
    if (typeof testFn === 'function' && testName.startsWith('test')) {
      console.log(`Running "${testName}"...`);
      testFn();
    }
  }
}

function getString(memory, addr) {
  const byteCount = Buffer.from(new Uint8Array(memory.buffer, addr - 4, 4)).readInt32LE();
  const buffer = new Uint8Array(memory.buffer, addr, byteCount);
  const encoder = new StringDecoder('utf16le');

  return encoder.write(buffer);
}

main().catch(error => {
  console.error('Test suite failed', error);

  process.exit(1);
});
