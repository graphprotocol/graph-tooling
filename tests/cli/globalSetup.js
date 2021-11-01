const { npmLinkCli } = require('./util')

module.exports = async () => {
  process.env.GRAPH_CLI_TESTS = '1'
  await npmLinkCli()
}
