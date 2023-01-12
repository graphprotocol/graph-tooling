declare module 'spawn-command' {
  import { spawn, SpawnOptions, ChildProcessByStdio, StdioPipe } from 'child_process'
  type SpawnResult = ChildProcessByStdio<Writable, Readable, Readable>
  export { SpawnOptions, SpawnResult }
  export default function spawn(command: string, options: SpawnOptions): SpawnResult
}
