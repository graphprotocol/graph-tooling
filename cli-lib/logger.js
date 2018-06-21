let chalk = require('chalk')

module.exports = class Logger {
  constructor(steps) {
    this.steps = steps
  }

  step(step, subject, ...msg) {
    console.info(`[${step}/${this.steps}]`, chalk.green(subject), ...msg)
  }

  note(subject, ...msg) {
    console.info(chalk.gray(subject), ...msg)
  }

  fatal(subject, ...msg) {
    console.error(chalk.red(subject), ...msg)
    process.exit(1)
  }
}
