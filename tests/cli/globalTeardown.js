const { npmUnlinkCli } = require('./util')

module.exports = async () => {
  delete process.env.GRAPH_CLI_TESTS
  await npmUnlinkCli()
}
