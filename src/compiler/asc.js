const asc = require('assemblyscript/cli/asc')

const createExitHandler = inputFile => () => {
  throw new Error(`The AssemblyScript compiler crashed when compiling this file: '${inputFile}'
Suggestion: try to comment the whole file and uncomment it little by little while re-running the graph-cli until you isolate the line where the problem happens.
Also, please contact us so we can make the CLI better by handling errors like this. You can reach out in any of these links:
- Discord channel: https://discord.gg/eM8CA6WA9r
- Github issues: https://github.com/graphprotocol/graph-cli/issues`)
}

const setupExitHandler = exitHandler => process.addListener('exit', exitHandler)

const removeExitHandler = exitHandler =>  process.removeListener('exit', exitHandler)

// Important note, the `asc.main` callback function parameter is synchronous,
// that's why this function doesn't need to be `async` and the throw works properly.
const assemblyScriptCompiler = (...args) => asc.main(...args, err => {
  if (err) {
    throw err
  }
})

const compilerDefaults = {
  stdout: process.stdout,
  stderr: process.stdout,
}

// You MUST call this function once before compiling anything.
// Internally it just delegates to the AssemblyScript compiler
// which just delegates to the binaryen lib.
const ready = async () => {
  await asc.ready
}

// For now this function doesn't check if `asc` is ready, because
// it requires an asynchronous wait. Whenever you call this function,
// it doesn't matter how many times, just make sure you call `ready`
// once before everything..
const compile = ({ inputFile, global, baseDir, libs, outputFile }) => {
  const exitHandler = createExitHandler(inputFile)

  setupExitHandler(exitHandler)

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
  ]

  assemblyScriptCompiler(compilerArgs, compilerDefaults)

  // only if compiler succeded, that is, when the line above doesn't throw
  removeExitHandler(exitHandler)
}

module.exports = {
  ready,
  compile,
}
