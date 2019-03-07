const fs = require('fs-extra')
const path = require('path')
const cliTest = require('./util').cliTest

describe('Init', () => {
  let baseDir = path.join(__dirname, 'init')

  let subgraphDir1 = path.join(baseDir, 'from-example')
  let subgraphDir2 = path.join(baseDir, 'from-contract')

  const removeSubgraphDirs = () => {
    if (fs.existsSync(subgraphDir1)) {
      fs.removeSync(subgraphDir1)
    }
    if (fs.existsSync(subgraphDir2)) {
      fs.removeSync(subgraphDir2)
    }
  }

  beforeAll(removeSubgraphDirs)
  afterAll(removeSubgraphDirs)

  cliTest(
    'From example',
    ['init', '--from-example', 'user/example-subgraph', subgraphDir1],
    'init/from-example',
    {
      exitCode: 0,
      timeout: 60000,
      cwd: baseDir,
    }
  )

  cliTest(
    'From contract',
    [
      'init',
      '--from-contract',
      '0xF87E31492Faf9A91B02Ee0dEAAd50d51d56D5d4d',
      '--network',
      'mainnet',
      'user/subgraph-from-contract',
      subgraphDir2,
    ],
    'init/from-contract',
    {
      exitCode: 0,
      timeout: 60000,
      cwd: baseDir,
    }
  )
})
