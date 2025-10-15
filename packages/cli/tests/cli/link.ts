import path from 'node:path';
import { system } from 'gluegun';
import spawn from 'spawn-command';

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

export const linkCli = () => {
  return runCommand(system.which('yarn') ? 'yarn' : 'npm', ['link']);
};

export const unlinkCli = () => {
  return runCommand(system.which('yarn') ? 'yarn' : 'npm', ['unlink']);
};
