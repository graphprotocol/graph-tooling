import { prompt } from 'gluegun';
import { describe, expect, it, vi } from 'vitest';
import EthereumABI from '../protocols/ethereum/abi.js';
import { ContractService } from './contracts.js';
import { checkForProxy } from './proxy.js';
import { loadRegistry } from './registry.js';

// Mock gluegun's prompt
vi.mock('gluegun', async () => {
  const actual = await vi.importActual('gluegun');
  return {
    ...actual,
    prompt: {
      confirm: vi.fn().mockResolvedValue(true),
    },
  };
});

describe('Proxy detection', async () => {
  const NETWORK = 'mainnet';
  const registry = await loadRegistry();
  const contractService = new ContractService(registry);

  interface ProxyTestCase {
    name: string;
    type: string;
    address: string;
    implementationAddress: string | null;
    expectedFunctions: string[];
  }

  const testCases: ProxyTestCase[] = [
    {
      name: 'USDC',
      type: 'EIP-1967 Upgradeable',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      implementationAddress: '0x43506849d7c04f9138d1a2050bbf3a0c054402dd',
      expectedFunctions: ['mint(address,uint256)', 'configureMinter(address,uint256)'],
    },
    {
      name: 'BUSD',
      type: 'OpenZeppelin Unstructured Storage',
      address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
      implementationAddress: '0x2A3F1A37C04F82aA274f5353834B2d002Db91015',
      expectedFunctions: ['reclaimBUSD()', 'claimOwnership()'],
    },
    {
      name: 'Gelato',
      type: 'EIP-2535 Diamond Pattern (not supported)',
      address: '0x3caca7b48d0573d793d3b0279b5f0029180e83b6',
      implementationAddress: null,
      expectedFunctions: [],
    },
  ];

  for (const testCase of testCases) {
    it(`should handle ${testCase.name} ${testCase.type} Proxy`, async () => {
      const abi = await contractService.getABI(EthereumABI, NETWORK, testCase.address);
      expect(abi).toBeDefined();

      const { implementationAddress, implementationAbi } = await checkForProxy(
        contractService,
        NETWORK,
        testCase.address,
        abi!,
      );

      expect(implementationAddress === testCase.implementationAddress);

      const implFunctions = implementationAbi?.callFunctionSignatures();
      for (const expectedFunction of testCase.expectedFunctions) {
        expect(implFunctions).toContain(expectedFunction);
      }
    });
  }

  it('should handle when user declines to use implementation', async () => {
    vi.mocked(prompt.confirm).mockResolvedValueOnce(false);
    const abi = await contractService.getABI(EthereumABI, NETWORK, testCases[0].address);
    expect(abi).toBeDefined();

    const { implementationAddress, implementationAbi } = await checkForProxy(
      contractService,
      NETWORK,
      testCases[0].address,
      abi!,
    );
    expect(implementationAddress).toBeNull();
    expect(implementationAbi).toBeNull();
  });
});
