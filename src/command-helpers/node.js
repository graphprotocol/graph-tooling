const normalizeUrl = require('normalize-url')
const URL = require('url').URL

const validateNodeUrl = node => new URL(node)

const normalizeNodeUrl = node => normalizeUrl(node, { stripHash: true })

module.exports = {
  validateNodeUrl,
  normalizeNodeUrl,
}
