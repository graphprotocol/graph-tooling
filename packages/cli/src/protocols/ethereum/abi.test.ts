import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ABI from './abi.js';

describe('ABI fallback parameters', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-abi-'));
  });
  afterEach(async () => {
    await fs.remove(dir);
  });

  it.each([null, undefined, []])(
    'generates a nameless fallback with parameters %s',
    async parameters => {
      const file = path.join(dir, 'abi.json');
      await fs.writeJson(file, [
        {
          type: 'fallback',
          name: '',
          inputs: parameters,
          outputs: parameters,
          stateMutability: 'payable',
        },
        {
          type: 'function',
          name: 'withdraw',
          inputs: [{ name: 'wad', type: 'uint256' }],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ]);
      const abi = ABI.load('Contract', file);
      expect(() => abi.callFunctionSignatures()).not.toThrow();
      const types = await abi.codeGenerator().generateTypes();
      const code = types.map(type => type.toString()).join('\n');
      expect(code).toContain('class DefaultCall');
      expect(code).toContain('class WithdrawCall');
      expect(code).toContain('get wad()');
    },
  );
});
