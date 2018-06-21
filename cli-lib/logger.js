let chalk = require('chalk')

module.exports = class Logger {
  constructor(steps, options) {
    this.steps = steps
    this.currentStep = 0
    this.options = options || {}
    this.prefix = this.options.prefix
  }

  step(subject, ...msg) {
    if (this.prefix === undefined) {
      console.info(`[${++this.currentStep}/${this.steps}]`, chalk.green(subject), ...msg)
    } else {
      console.info(
        this.prefix,
        `[${++this.currentStep}/${this.steps}]`,
        chalk.green(subject),
        ...msg
      )
    }
  }

  note(subject, ...msg) {
    if (this.prefix === undefined) {
      console.info(chalk.gray(subject), ...msg)
    } else {
      console.info(this.prefix, chalk.gray(subject), ...msg)
    }
  }

  fatal(subject, ...msg) {
    if (this.prefix === undefined) {
      console.error(chalk.red(subject), ...msg)
    } else {
      console.error(this.prefix, chalk.red(subject), ...msg)
    }
    process.exit(1)
  }
}
