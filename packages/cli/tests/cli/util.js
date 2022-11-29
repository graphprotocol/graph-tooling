const fs = require('fs-extra')
const path = require('path')
const spawn = require('spawn-command')
const stripAnsi = require('strip-ansi')

// Deletes folder if:
// - flag is true
// - folder exists
const deleteDir = (dir, flag) => {
  if (flag && fs.existsSync(dir)) {
    fs.removeSync(dir)
  }
}

const resolvePath = p => path.join(__dirname, p)

const cliTest = (title, args, testPath, options = {}) => {
  test(
    title,
    async () => {
      try {
        deleteDir(resolvePath(`./${testPath}`), options.deleteDir)

        // Use the provided cwd if desired
        let cwd =
          options.cwd ? options.cwd : resolvePath(`./${testPath}`)

        let [exitCode, stdout, stderr] = await runGraphCli(args, cwd)

        let expectedExitCode = undefined
        if (options.exitCode !== undefined) {
          expectedExitCode = options.exitCode
        }
        let expectedStdout = undefined
        try {
          expectedStdout = fs.readFileSync(resolvePath(`./${testPath}.stdout`), 'utf-8')
        } catch (e) {}

        let expectedStderr = undefined
        try {
          expectedStderr = fs.readFileSync(resolvePath(`./${testPath}.stderr`), 'utf-8')
        } catch (e) {}

        if (expectedStderr !== undefined) {
          // For some reason the error sometimes comes in stdout, then
          // stderr comes empty.
          //
          // If that's the case, we should throw it so it's easier
          // to debug the error.
          //
          // TODO: investigate why that happens (somewhere it should
          // be using console.error or print.error for example) so this
          // check can be removed.
          if (stderr.length === 0 && stdout.length !== 0) {
            throw new Error(stdout)
          }
          expect(stripAnsi(stderr)).toBe(expectedStderr)
        }
        if (expectedExitCode !== undefined) {
          expect(exitCode).toBe(expectedExitCode)
        }
        if (expectedStdout !== undefined) {
          expect(stripAnsi(stdout)).toBe(expectedStdout)
        }
      } finally {
        deleteDir(resolvePath(`./${testPath}`), options.deleteDir)
      }
    },
    options.timeout || undefined,
  )
}

const runCommand = async (command, args = [], cwd = process.cwd()) => {
  // Make sure to set an absolute working directory
  cwd = cwd[0] !== '/' ? path.resolve(__dirname, cwd) : cwd

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const child = spawn(`${command} ${args.join(' ')}`, { cwd })

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

const runGraphCli = async (args, cwd) => {
  // Resolve the path to graph.js
  let graphCli = path.join(__dirname, '..', '..', 'bin', 'graph')

  return await runCommand(graphCli, args, cwd)
}

const npmLinkCli = () => runCommand('npm', ['link'])

const npmUnlinkCli = () => runCommand('npm', ['unlink'])

module.exports = {
  cliTest,
  npmLinkCli,
  npmUnlinkCli,
  runGraphCli,
}
