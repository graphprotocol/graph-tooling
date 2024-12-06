import { prompt } from 'gluegun';
import { PromptOptions } from 'gluegun/build/types/toolbox/prompt-enquirer-types';

export class PromptManager {
  private steps: PromptOptions[] = [];
  private currentStep = 0;
  private results: any[] = [];
  private stepLines: number[] = [];

  // adds a step prompt
  addStep(options: PromptOptions) {
    this.steps.push(options);
    this.stepLines.push(1);
  }

  // "options" doesn't take closure, so to populate it dynamically we need to call this
  setOptions(stepName: string, options: Partial<PromptOptions>) {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      Object.assign(step, options);
    }
  }

  // can be called externally if more than one line is added on the step
  addLine() {
    this.stepLines[this.currentStep]++;
  }

  // clears the lines added during the step
  private clearStepLines() {
    const linesToClear = 1 + this.stepLines[this.currentStep];
    for (let i = 0; i < linesToClear; i++) {
      process.stdout.write('\x1b[1A\x1b[2K'); // Move up and clear line
    }
    this.stepLines[this.currentStep] = 1;
  }

  // runs all steps and returns the results
  async execute() {
    return prompt.ask(this.steps);
  }

  // allows going back with Escape and returns the results
  async executeInteractive() {
    let isCtrlC = false;
    // gluegun always throws empty string so we don't know what caused the exception, so we need this workaround to handle Ctrl+C
    const keypressHandler = (_: string, key: { name: string; ctrl: boolean }) => {
      isCtrlC = key.ctrl && key.name === 'c';
    };
    process.stdin.on('keypress', keypressHandler);

    while (this.currentStep < this.steps.length) {
      try {
        this.results[this.currentStep] = await prompt.ask(this.steps[this.currentStep]);
        this.currentStep++;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        if (isCtrlC || this.currentStep === 0) {
          process.stdout.write('\n');
          process.exit(0);
        }

        this.currentStep--;
        while (this.currentStep > 0) {
          delete this.results[this.currentStep];
          const skip = this.steps[this.currentStep].skip;
          const shouldSkip = typeof skip === 'function' ? await skip({}) : skip;
          if (!shouldSkip) break;
          this.currentStep--;
        }
        this.clearStepLines();
      }
    }

    process.stdin.removeListener('keypress', keypressHandler);
    return this.results;
  }
}
