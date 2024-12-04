import { prompt } from 'gluegun';
import { PromptOptions } from 'gluegun/build/types/toolbox/prompt-enquirer-types';

export class PromptManager {
  private steps: PromptOptions[] = [];
  private currentStep = 0;
  private results: any[] = [];

  addStep(options: PromptOptions) {
    this.steps.push(options);
  }

  // runs all steps and returns the results
  async execute() {
    return prompt.ask(this.steps);
  }

  // allows going back with Escape and returns the results
  async executeInteractive() {
    let isCtrlC = false;
    // gluegun always throws empty string, so we have this workaround
    const keypressHandler = (_: string, key: { name: string; ctrl: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        isCtrlC = true;
      }
    };
    process.stdin.on('keypress', keypressHandler);

    while (this.currentStep < this.steps.length) {
      try {
        const result = await prompt.ask(this.steps[this.currentStep]);
        this.results[this.currentStep] = result;
        this.currentStep++;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        if (isCtrlC || this.currentStep === 0) {
          process.stdout.write('\n');
          process.exit(0);
        }
        // delete 2 lines
        process.stdout.write('\x1b[1A\x1b[2K\x1b[1A\x1b[2K');
        this.currentStep--;
      }
    }

    process.stdin.removeListener('keypress', keypressHandler);
    return this.results;
  }
}
