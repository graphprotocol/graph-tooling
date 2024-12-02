import immutable from 'immutable';
import { NetworksRegistry } from '@pinax/graph-networks-registry';
import debugFactory from '../debug.js';
import fetch from '../fetch.js';
import ABI from '../protocols/ethereum/abi.js';
import { withSpinner } from './spinner.js';

const logger = debugFactory('graph-cli:contract-service');

export class ContractService {
  constructor(private registry: NetworksRegistry) {}

  private async fetchFromEtherscan(url: string): Promise<any | null> {
    const result = await fetch(url).catch(_error => {
      throw new Error(`Etherscan API is unreachable`);
    });
    let json: any = {};

    if (result.ok) {
      json = await result.json().catch(error => {
        throw new Error(`Invalid JSON: ${error}`);
      });

      if (json.status === '1') return json;
    }

    logger(
      'Failed to fetch from etherscan: [%s] %s (%s)\n%O',
      result.status,
      result.statusText,
      result.url,
      json,
    );
    if (json.message) {
      throw new Error(`${json.message ?? ''} - ${json.result ?? ''}`);
    }
    return null;
  }

  // replace {api_key} with process.env[api_key]
  // return empty string if env var not found
  private applyVars(url: string): string {
    const match = url.match(/\{([^}]+)\}/);
    if (!match) return url;
    const key = match[1];
    return process.env[key] ? url.replace(`{${key}}`, process.env[key]) : '';
  }

  private getEtherscanUrls(networkId: string) {
    const network = this.registry.getNetworkById(networkId);
    if (!network) {
      throw new Error(`Invalid network ${networkId}`);
    }

    return (
      network.apiUrls
        ?.filter(item => ['etherscan', 'blockscout'].includes(item.kind))
        ?.map(item => item.url)
        .map(this.applyVars)
        .filter(Boolean) ?? []
    );
  }

  private getRpcUrls(networkId: string) {
    const network = this.registry.getNetworkById(networkId);
    if (!network) {
      throw new Error(`Invalid network ${networkId}`);
    }

    return network.rpcUrls?.map(this.applyVars).filter(Boolean) ?? [];
  }

  async getABI(ABICtor: typeof ABI, networkId: string, address: string) {
    const urls = this.getEtherscanUrls(networkId);

    let errors: string[] = [];
    return await withSpinner(
      `Fetching ABI from Etherscan`,
      `Failed to fetch ABI from Etherscan`,
      `Warnings while fetching ABI from Etherscan`,
      async () => {
        if (!urls.length) {
          throw new Error(`No Etherscan API available`);
        }
        for (const url of urls) {
          try {
            const json = await this.fetchFromEtherscan(
              `${url}?module=contract&action=getabi&address=${address}`,
            );

            if (json) {
              return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));
            }
            throw new Error(`no result: ${JSON.stringify(json)}`);
          } catch (error) {
            logger(`Failed to fetch from ${url}: ${error}`);
            errors.push(`${error}`);
          }
        }

        throw new Error(errors?.[0]);
      },
    );
  }

  async getStartBlock(networkId: string, address: string): Promise<string> {
    const urls = this.getEtherscanUrls(networkId);

    return await withSpinner(
      `Fetching Start Block`,
      `Failed to fetch Start Block`,
      `Warnings while fetching deploy contract transaction from Etherscan`,
      async () => {
        if (!urls.length) {
          throw new Error(`No Etherscan API available`);
        }
        for (const url of urls) {
          try {
            const json = await this.fetchFromEtherscan(
              `${url}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
            );

            if (json?.result?.length) {
              if (json.result[0]?.blockNumber) {
                return json.result[0].blockNumber;
              }
              const txHash = json.result[0].txHash;
              const tx = await this.fetchTransactionByHash(networkId, txHash);
              if (!tx?.blockNumber) {
                throw new Error(`no blockNumber: ${JSON.stringify(tx)}`);
              }
              return Number(tx.blockNumber).toString();
            }
            throw new Error(`no result: ${JSON.stringify(json)}`);
          } catch (error) {
            logger(`Failed to fetch start block from ${url}: ${error}`);
          }
        }

        throw new Error(`Failed to fetch deploy contract transaction for ${address}`);
      },
    );
  }

  async getContractName(networkId: string, address: string): Promise<string> {
    const urls = this.getEtherscanUrls(networkId);

    return await withSpinner(
      `Fetching Contract Name`,
      `Failed to fetch Contract Name`,
      `Warnings while fetching contract name from Etherscan`,
      async () => {
        if (!urls.length) {
          throw new Error(`No Etherscan API available`);
        }
        for (const url of urls) {
          try {
            const json = await this.fetchFromEtherscan(
              `${url}?module=contract&action=getsourcecode&address=${address}`,
            );

            if (json) {
              const { ContractName } = json.result[0];
              if (ContractName !== '') {
                return ContractName;
              }
            }
            throw new Error(`no result: ${JSON.stringify(json)}`);
          } catch (error) {
            logger(`Failed to fetch from ${url}: ${error}`);
          }
        }

        throw new Error(`Failed to fetch contract name for ${address}`);
      },
    );
  }

  private async fetchTransactionByHash(networkId: string, txHash: string) {
    const urls = this.getRpcUrls(networkId);
    if (!urls.length) {
      throw new Error(`No JSON-RPC available`);
    }
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [txHash],
            id: 1,
          }),
        });

        const json = await response.json();
        if (json.result) {
          return json.result;
        }
        throw new Error(JSON.stringify(json));
      } catch (error) {
        logger(`Failed to fetch tx ${txHash} from ${url}: ${error}`);
      }
    }

    throw new Error(`JSON-RPC is unreachable`);
  }
}
