declare module 'spawn-command' {
  import { spawn, SpawnOptions, ChildProcessByStdio } from 'child_process';

  type SpawnResult = ChildProcessByStdio<Writable, Readable, Readable>;
  export { SpawnOptions, SpawnResult };
  export default function spawn(command: string, options: SpawnOptions): SpawnResult;
}
