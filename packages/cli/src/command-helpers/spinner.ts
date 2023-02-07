import * as toolbox from 'gluegun';
import { ux } from '@oclif/core';
import { ActionBase } from '@oclif/core/lib/cli-ux';

export type Spinner = ReturnType<toolbox.GluegunPrint['spin']>;

export const step = (spinner: Spinner, subject: string, text?: string) => {
  if (text) {
    spinner.stopAndPersist({
      text: toolbox.print.colors.muted(`${subject} ${text}`),
    });
  } else {
    spinner.stopAndPersist({ text: toolbox.print.colors.muted(subject) });
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
//
// @deprecated
export const withSpinner = async (
  text: string,
  errorText: string,
  warningText: string,
  f: (spinner: Spinner) => Promise<any> | any, // TODO: type result
) => {
  const spinner = toolbox.print.spin(text);
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

// Executes the function `f` while displaying a command-line spinner.
export async function useSpinner<T = any>(
  text: string,
  errorText: string,
  warningText: string,
  f: (action: ActionBase) => Promise<T> | T, // TODO: return type is not correct. we might unfold the result field
): Promise<T> {
  const { action } = ux;
  action.start(text);
  try {
    const result = await f(action);
    if (result && typeof result === 'object') {
      const hasError = 'error' in result;
      const hasWarning = 'warning' in result;
      const hasResult = 'result' in result;

      if (hasError) {
        action.stop(`✖ ${errorText}: ${result.error}`);
        return (hasResult ? result.result : result) as T;
      }
      if (hasWarning && hasResult) {
        if (result.warning !== null) {
          action.stop(`⚠️ ${warningText}: ${result.warning}`);
        }
        action.stop('✔');
        return result.result as T;
      }
      action.stop('✔');
      return result;
    }
    action.stop('✔');
    return result;
  } catch (e) {
    action.stop(`✖ ${errorText}: ${e.message}`);
    throw e;
  }
}
