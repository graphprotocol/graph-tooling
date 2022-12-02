const path = require('path')

const displayPath = p =>
  path.relative(process.cwd(), p)

module.exports = {
  displayPath,
}
