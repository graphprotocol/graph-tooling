let Logger = require('./logger')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options
    this.logger = new Logger(1)
  }

  generateTypes() {
    this.logger.step(1, 'Generating TypeScript types')
  }
}
