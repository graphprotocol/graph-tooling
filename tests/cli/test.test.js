const fs = require('fs-extra')
const path = require('path')
const { system } = require('gluegun')
const cliTest = require('./util').cliTest

describe('Test', () => {
  let baseDir = path.join(__dirname, 'test')

  beforeAll(async () => {
    // Install dependencies for tests
    await system.run('yarn', { cwd: path.join(baseDir, 'basic-event-handlers') })
  }, 60 * 1000)

  cliTest(
    'Event handlers',
    ['test', '--deterministic-output', '"yarn test"'],
    'test/basic-event-handlers',
    {
      exitCode: 0,
      timeout: 60000,
      cwd: path.join(baseDir, 'basic-event-handlers'),
    },
  )
})
