import { GluegunPrint, print } from 'gluegun';

export type Spinner = ReturnType<GluegunPrint['spin']>;

export const step: (spinner: Spinner, subject: string, text?: string) => Spinner = (
  spinner,
  subject,
  text,
) => {
  if (text) {
    spinner.stopAndPersist({
      text: print.colors.muted(`${subject} ${text}`),
    });
  } else {
    spinner.stopAndPersist({ text: print.colors.muted(subject) });
  }
  spinner.start();
  return spinner;
};

// Executes the function `f` in a command-line spinner, using the
// provided captions for in-progress, error and failed messages.
//
// If `f` throws an error, the spinner stops with the failure message
//   and rethrows the error.
// If `f` returns an object with a `warning` and a `result` key, the
//   spinner stops with the warning message and returns the `result` value.
// Otherwise the spinner prints the in-progress message with a check mark
//   and simply returns the value returned by `f`.
export const withSpinner = async (
  text: string,
  errorText: string,
  warningText: string,
  f: (spinner: Spinner) => Promise<any> | any, // TODO: type result
) => {
  const spinner = print.spin(text);
  try {
    const result = await f(spinner);
    if (typeof result === 'object') {
      const hasError = Object.keys(result).includes('error');
      const hasWarning = Object.keys(result).includes('warning');
      const hasResult = Object.keys(result).includes('result');

      if (hasError) {
        spinner.fail(`${errorText}: ${result.error}`);
        return hasResult ? result.result : result;
      }
      if (hasWarning && hasResult) {
        if (result.warning !== null) {
          spinner.warn(`${warningText}: ${result.warning}`);
        }
        spinner.succeed(text);
        return result.result;
      }
      spinner.succeed(text);
      return result;
    }
    spinner.succeed(text);
    return result;
  } catch (e) {
    spinner.fail(`${errorText}: ${e.message}`);
    throw e;
  }
};
