import * as asc from 'assemblyscript/cli/asc';

const createExitHandler = (inputFile: string) => () => {
  throw new Error(`The AssemblyScript compiler crashed when compiling this file: '${inputFile}'
Suggestion: try to comment the whole file and uncomment it little by little while re-running the graph-cli until you isolate the line where the problem happens.
Also, please contact us so we can make the CLI better by handling errors like this. You can reach out in any of these links:
- Discord channel: https://discord.gg/eM8CA6WA9r
- Github issues: https://github.com/graphprotocol/graph-tooling/issues/new/choose`);
};

const setupExitHandler = (exitHandler: (code: number) => void) =>
  process.addListener('exit', exitHandler);

const removeExitHandler = (exitHandler: (code: number) => void) =>
  process.removeListener('exit', exitHandler);

// Important note, the `asc.main` callback function parameter is synchronous,
// that's why this function doesn't need to be `async` and the throw works properly.
const assemblyScriptCompiler = (argv: string[], options: asc.APIOptions) =>
  asc.main(argv, options, err => {
    if (err) {
      throw err;
    }
    return 0;
  });

const compilerDefaults = {
  stdout: process.stdout,
  stderr: process.stdout,
};

// You MUST call this function once before compiling anything.
// Internally it just delegates to the AssemblyScript compiler
// which just delegates to the binaryen lib.
export const ready = async () => {
  await asc.ready;
};

export interface CompileOptions {
  inputFile: string;
  global: string;
  baseDir: string;
  libs: string;
  outputFile: string;
}

// For now this function doesn't check if `asc` is ready, because
// it requires an asynchronous wait. Whenever you call this function,
// it doesn't matter how many times, just make sure you call `ready`
// once before everything..
export const compile = ({ inputFile, global, baseDir, libs, outputFile }: CompileOptions) => {
  const exitHandler = createExitHandler(inputFile);

  setupExitHandler(exitHandler);

  const compilerArgs = [
    '--explicitStart',
    '--exportRuntime',
    '--runtime',
    'stub',
    inputFile,
    global,
    '--baseDir',
    baseDir,
    '--lib',
    libs,
    '--outFile',
    outputFile,
    '--optimize',
    '--debug',
  ];

  assemblyScriptCompiler(compilerArgs, compilerDefaults);

  // only if compiler succeeded, that is, when the line above doesn't throw
  removeExitHandler(exitHandler);
};
