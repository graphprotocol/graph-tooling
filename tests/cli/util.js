const path = require('path')
const spawn = require('spawn-command')
const fs = require('fs')

const cliTest = (title, testPath) => {
  test(title, async () => {
    let resolvePath = p => path.join(__dirname, p)

    let [exitCode, stdout, stderr] = await runCli(
      ['codegen'],
      resolvePath(`./${testPath}`)
    )

    let expectedExitCode = undefined
    try {
      expectedExitCode = parseInt(
        fs.readFileSync(resolvePath(`./${testPath}.exit`)),
        'utf-8'
      )
    } catch (e) {}

    let expectedStdout = undefined
    try {
      expectedStdout = fs.readFileSync(resolvePath(`./${testPath}.stdout`), 'utf-8')
    } catch (e) {}

    let expectedStderr = undefined
    try {
      expectedStderr = fs.readFileSync(resolvePath(`./${testPath}.stderr`), 'utf-8')
    } catch (e) {}

    if (expectedExitCode !== undefined) {
      expect(exitCode).toBe(expectedExitCode)
    }
    if (expectedStdout !== undefined) {
      expect(stdout).toMatch(expectedStdout)
    }
    if (expectedStderr !== undefined) {
      expect(stderr).toMatch(expectedStderr)
    }
  })
}

const runCli = async (args = [], cwd = process.cwd()) => {
  // Resolve the path to graph.js
  let graphCli = path.join(__dirname, '..', '..', 'graph.js')

  // Make sure to set an absolute working directory
  cwd = cwd[0] !== '/' ? path.resolve(__dirname, cwd) : cwd

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const command = `${graphCli} ${args.join(' ')}`
    const child = spawn(command, { cwd })

    child.on('error', error => {
      reject(error)
    })

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('exit', exitCode => {
      resolve([exitCode, stdout, stderr])
    })
  })
}

module.exports = {
  cliTest,
  runCli,
}
