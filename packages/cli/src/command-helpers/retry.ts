import { prompt } from 'gluegun';

export async function retryWithPrompt<T>(func: () => Promise<T>): Promise<T | undefined> {
  for (;;) {
    try {
      return await func();
    } catch (_) {
      try {
        const { retry } = await prompt.ask({
          type: 'confirm',
          name: 'retry',
          message: 'Do you want to retry?',
          initial: true,
        });

        if (!retry) {
          break;
        }
      } catch (_) {
        break;
      }
    }
  }
  return undefined;
}
