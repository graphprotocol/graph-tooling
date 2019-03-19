const chalk = require('chalk')
const immutable = require('immutable')
const toolbox = require('gluegun/toolbox')

const step = (spinner, subject, text) => {
  if (text) {
    spinner.stopAndPersist({
      text: toolbox.print.colors.muted(`${subject} ${text}`),
    })
  } else {
    spinner.stopAndPersist({ text: toolbox.print.colors.muted(subject) })
  }
  spinner.start()
  return spinner
}

// Executes the function `f` in a command-line spinner, using the
// provided captions for in-progress, error and failed messages.
//
// If `f` throws an error, the spinner stops with the failure message
//   and rethrows the error.
// If `f` returns an object with a `warning` and a `result` key, the
//   spinner stops with the warning message and returns the `result` value.
// Otherwise the spinner prints the in-progress message with a check mark
//   and simply returns the value returned by `f`.
const withSpinner = async (text, errorText, warningText, f) => {
  let spinner = toolbox.print.spin(text)
  try {
    let result = await f(spinner)
    if (typeof result === 'object') {
      let hasWarning = Object.keys(result).indexOf('warning') >= 0
      let hasResult = Object.keys(result).indexOf('result') >= 0
      if (hasWarning && hasResult) {
        if (result.warning !== null) {
          spinner.warn(`${warningText}: ${result.warning}`)
        }
        spinner.succeed(text)
        return result.result
      } else {
        spinner.succeed(text)
        return result
      }
    } else {
      spinner.succeed(text)
      return result
    }
  } catch (e) {
    spinner.fail(`${errorText}: ${e.message}`)
    throw e
  }
}

module.exports = {
  step,
  withSpinner,
}
