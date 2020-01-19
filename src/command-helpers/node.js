const URL = require('url').URL

const validateNodeUrl = node => new URL(node)

const normalizeNodeUrl = node => new URL(node).toString()

module.exports = {
  validateNodeUrl,
  normalizeNodeUrl,
}
