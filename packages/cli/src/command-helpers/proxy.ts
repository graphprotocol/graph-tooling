import { prompt } from 'gluegun';
import EthereumABI from '../protocols/ethereum/abi.js';
import { ContractService } from './contracts.js';
import { retryWithPrompt } from './retry.js';
import { withSpinner } from './spinner.js';

export interface CheckForProxyResult {
  implementationAbi: EthereumABI | null;
  implementationAddress: string | null;
}

export async function checkForProxy(
  contractService: ContractService,
  network: string,
  address: string,
  abi: EthereumABI,
): Promise<CheckForProxyResult> {
  let implementationAddress = null;
  let implementationAbi = null;

  const maybeProxy = abi.callFunctionSignatures()?.includes('upgradeTo(address)');
  if (maybeProxy) {
    const impl = await retryWithPrompt(() =>
      withSpinner(
        'Fetching proxy implementation address...',
        'Failed to fetch proxy implementation address',
        'Warning fetching proxy implementation address',
        () => contractService.getProxyImplementation(network, address),
      ),
    );

    if (impl) {
      const useImplementation = await prompt
        .confirm(`Proxy contract detected. Use implementation contract ABI at ${impl}?`, true)
        .catch(() => false);

      if (useImplementation) {
        implementationAddress = impl;
        implementationAbi = await retryWithPrompt(() =>
          withSpinner(
            'Fetching implementation contract ABI...',
            'Failed to fetch implementation ABI',
            'Warning fetching implementation ABI',
            () => contractService.getABI(EthereumABI, network, implementationAddress!),
          ),
        );
      }
    }
  }

  return {
    implementationAbi,
    implementationAddress,
  };
}
