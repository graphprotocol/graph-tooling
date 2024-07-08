import path from 'path';
import fs from 'fs-extra';
import { system } from 'gluegun';
import spawn from 'spawn-command';
import stripAnsi from 'strip-ansi';
import { test } from 'vitest';

// Deletes folder if:
// - flag is true
// - folder exists
const deleteDir = (dir: string, flag: boolean) => {
  if (flag && fs.existsSync(dir)) {
    fs.removeSync(dir);
  }
};

const resolvePath = (p: string) => path.join(__dirname, p);

export function cliTest(
  title: string,
  args: string[],
  testPath: string,
  options: {
    cwd?: string;
    deleteDir?: boolean;
    exitCode?: number;
    timeout?: number;
    runBuild?: boolean;
  } = {},
) {
  test(
    title,
    async ({ expect }) => {
      try {
        deleteDir(resolvePath(`./${testPath}`), !!options.deleteDir);

        // Use the provided cwd if desired
        const cwd = options.cwd || resolvePath(`./${testPath}`);

        const [exitCode, stdout, stderr] = await runGraphCli(args, cwd);

        expect(stripAnsi(stderr)).toMatchSnapshot();
        expect(exitCode).toMatchSnapshot();
        expect(stripAnsi(stdout)).toMatchSnapshot();
      } finally {
        if (options.runBuild) {
          const [exitCode] = await packageManagerBuild(resolvePath(`./${testPath}`));
          expect(exitCode).toBe(0);
        }
        deleteDir(resolvePath(`./${testPath}`), !!options.deleteDir);
      }
    },
    options.timeout || undefined,
  );
}

function runCommand(
  command: string,
  args: string[] = [],
  cwd = process.cwd(),
): Promise<
  [
    number | null, // exitCode
    string, // stdout
    string, // stderr
  ]
> {
  // Make sure to set an absolute working directory
  cwd = cwd[0] === '/' ? cwd : path.resolve(__dirname, cwd);

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(`${command} ${args.join(' ')}`, { cwd });

    child.on('error', error => {
      reject(error);
    });

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('exit', exitCode => {
      resolve([exitCode, stdout, stderr]);
    });
  });
}

export function runGraphCli(args: string[], cwd: string) {
  // Resolve the path to graph.js
  const graphCli = path.join(__dirname, '..', '..', 'bin', 'run');

  return runCommand(graphCli, args, cwd);
}

export const linkCli = () => {
  runCommand(system.which('yarn') ? 'yarn' : 'npm', ['link']);
};

export const unlinkCli = () => {
  runCommand(system.which('yarn') ? 'yarn' : 'npm', ['unlink']);
};

export const packageManagerBuild = (cwd: string) =>
  runCommand(system.which('yarn') ? 'yarn' : 'npm', ['run', 'build'], cwd);
