import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import immutable from 'immutable';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import Protocol from '../protocols/index.js';
import DataSourceTemplateCodeGenerator from './template.js';

const require = createRequire(import.meta.url);
const compilerDirectory = path.dirname(require.resolve('assemblyscript'));
const run = promisify(execFile);
const sdk = fileURLToPath(new URL('../../../ts/', import.meta.url));
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(kind: string, invalid = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-template-'));
  directories.push(directory);
  const modules = path.join(directory, 'node_modules', '@graphprotocol');
  fs.mkdirSync(modules, { recursive: true });
  fs.symlinkSync(sdk, path.join(modules, 'graph-ts'), 'dir');

  const generator = new DataSourceTemplateCodeGenerator(
    immutable.fromJS({ name: 'GeneratedTemplate', kind }),
    new Protocol('ethereum'),
  );
  const ethereum = kind.startsWith('ethereum');
  const argument = ethereum ? 'address: Address' : 'cid: string';
  const value = invalid ? (ethereum ? '"wrong"' : '123') : ethereum ? 'address' : 'cid';
  const entry = path.join(directory, 'index.ts');
  fs.writeFileSync(
    entry,
    `${generator.generateModuleImports().join('\n')}
${generator.generateTypes().join('\n')}
export function createTemplate(${argument}, context: DataSourceContext): void {
  GeneratedTemplate.create(${value});
  GeneratedTemplate.createWithContext(${value}, context);
}
`,
  );
  // AS 0.19's globals predate these TypeScript standard function interfaces.
  const globals = path.join(directory, 'globals.d.ts');
  fs.writeFileSync(
    globals,
    'interface CallableFunction extends Function {}\ninterface NewableFunction extends Function {}\n',
  );
  return { directory, entry, globals };
}

function checkTypes(files: ReturnType<typeof fixture>) {
  const program = ts.createProgram(
    [files.entry, files.globals, path.join(compilerDirectory, 'std/assembly/index.d.ts')],
    {
      noEmit: true,
      noLib: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      strictNullChecks: true,
      types: [],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
    },
  );
  return ts.getPreEmitDiagnostics(program);
}

describe.each(['ethereum/contract', 'file/ipfs', 'file/arweave'])('%s template', kind => {
  it('type-checks the generated module against the real graph-ts package', () => {
    const diagnostics = checkTypes(fixture(kind));
    expect(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
  });

  it('still rejects incorrect create arguments', () => {
    const diagnostics = checkTypes(fixture(kind, true));
    expect(diagnostics.filter(d => d.code === 2345)).toHaveLength(2);
  });

  it('compiles both factory calls into WebAssembly with the host imports', async () => {
    const files = fixture(kind);
    const output = path.join(files.directory, 'mapping.wasm');
    await run(
      process.execPath,
      [
        path.join(compilerDirectory, 'bin/asc'),
        files.entry,
        path.join(sdk, 'global/global.ts'),
        '--baseDir',
        files.directory,
        '--lib',
        path.join(files.directory, 'node_modules'),
        '--runtime',
        'stub',
        '--outFile',
        output,
      ],
      { cwd: files.directory },
    );
    const imports = WebAssembly.Module.imports(new WebAssembly.Module(fs.readFileSync(output)));
    expect(imports.some(item => item.name === 'dataSource.create')).toBe(true);
    expect(imports.some(item => item.name === 'dataSource.createWithContext')).toBe(true);
  }, 15_000);
});
