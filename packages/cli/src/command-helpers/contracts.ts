import immutable from 'immutable';
import { NetworksRegistry } from '@pinax/graph-networks-registry';
import debugFactory from '../debug.js';
import fetch from '../fetch.js';
import ABI from '../protocols/ethereum/abi.js';

const logger = debugFactory('graph-cli:contract-service');

export class ContractService {
  constructor(private registry: NetworksRegistry) {}

  private async fetchFromEtherscan(url: string): Promise<any | null> {
    const result = await fetch(url).catch(_error => {
      throw new Error(`Contract API is unreachable`);
    });
    let json: any = {};

    if (result.ok) {
      json = await result.json().catch(error => {
        throw new Error(`Invalid JSON: ${error}`);
      });

      if (json.status === '1') return json;
    }

    logger(
      'Failed to fetch from contract API: [%s] %s (%s)\n%O',
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
    if (!urls.length) {
      throw new Error(`No contract API available for ${networkId} in the registry`);
    }

    try {
      const result = await Promise.any(
        urls.map(url =>
          this.fetchFromEtherscan(`${url}?module=contract&action=getabi&address=${address}`).then(
            json => {
              if (!json?.result) {
                throw new Error(`no result: ${JSON.stringify(json)}`);
              }
              return new ABICtor('Contract', undefined, immutable.fromJS(JSON.parse(json.result)));
            },
          ),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const err of error.errors) {
          logger(`Failed to fetch ABI: ${err}`);
        }
        throw new Error(`Failed to fetch ABI for ${address}`);
      }
      throw error;
    }
  }

  async getStartBlock(networkId: string, address: string): Promise<string> {
    const urls = this.getEtherscanUrls(networkId);
    if (!urls.length) {
      throw new Error(`No contract API available for ${networkId} in the registry`);
    }

    try {
      const result = await Promise.any(
        urls.map(url =>
          this.fetchFromEtherscan(
            `${url}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
          ).then(async json => {
            if (!json?.result?.length) {
              throw new Error(`no result: ${JSON.stringify(json)}`);
            }
            if (json.result[0]?.blockNumber) {
              return json.result[0].blockNumber;
            }
            const txHash = json.result[0].txHash;
            const tx = await this.fetchTransactionByHash(networkId, txHash);
            if (!tx?.blockNumber) {
              throw new Error(`no blockNumber: ${JSON.stringify(tx)}`);
            }
            return Number(tx.blockNumber).toString();
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const err of error.errors) {
          logger(`Failed to fetch start block: ${err}`);
        }
        throw new Error(`Failed to fetch deploy contract transaction for ${address}`);
      }
      throw error;
    }
  }

  async getContractName(networkId: string, address: string): Promise<string> {
    const urls = this.getEtherscanUrls(networkId);
    if (!urls.length) {
      throw new Error(`No contract API available for ${networkId} in the registry`);
    }

    try {
      const result = await Promise.any(
        urls.map(url =>
          this.fetchFromEtherscan(
            `${url}?module=contract&action=getsourcecode&address=${address}`,
          ).then(json => {
            if (!json) {
              throw new Error(`no result: ${JSON.stringify(json)}`);
            }
            const { ContractName } = json.result[0];
            if (ContractName === '') {
              throw new Error('Contract name is empty');
            }
            return ContractName;
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const err of error.errors) {
          logger(`Failed to fetch contract name: ${err}`);
        }
        throw new Error(`Failed to fetch contract name for ${address}`);
      }
      throw error;
    }
  }

  async getFromSourcify(
    ABICtor: typeof ABI,
    networkId: string,
    address: string,
  ): Promise<{ abi: ABI; startBlock: string; name: string } | null> {
    try {
      const network = this.registry.getNetworkById(networkId);
      if (!network) throw new Error(`Invalid network ${networkId}`);

      if (!network.caip2Id.startsWith('eip155'))
        throw new Error(`Invalid chainId, Sourcify API only supports EVM chains`);

      if (!address.startsWith('0x') || address.length != 42)
        throw new Error(`Invalid address, must start with 0x prefix and be 20 bytes long`);

      const chainId = network.caip2Id.split(':')[1];
      const url = `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,compilation,deployment`;
      const resp = await fetch(url).catch(error => {
        throw new Error(`Sourcify API is unreachable: ${error}`);
      });
      if (resp.status === 404) throw new Error(`Sourcify API says contract is not verified`);
      if (!resp.ok) throw new Error(`Sourcify API returned status ${resp.status}`);
      const json: {
        abi: any[];
        compilation: { name: string };
        deployment: { blockNumber: string };
      } = await resp.json();

      if (json) {
        const abi = json.abi;
        const contractName = json.compilation?.name;
        const blockNumber = json.deployment?.blockNumber;

        if (!abi || !contractName || !blockNumber) throw new Error('Contract is missing metadata');

        return {
          abi: new ABICtor(contractName, undefined, immutable.fromJS(abi)) as ABI,
          startBlock: Number(blockNumber).toString(),
          name: contractName,
        };
      }

      throw new Error(`No result: ${JSON.stringify(json)}`);
    } catch (error) {
      logger(`Failed to fetch from Sourcify: ${error}`);
    }

    return null;
  }

  private async fetchTransactionByHash(networkId: string, txHash: string) {
    const urls = this.getRpcUrls(networkId);
    if (!urls.length) {
      throw new Error(`No JSON-RPC available for ${networkId} in the registry`);
    }

    try {
      const result = await Promise.any(
        urls.map(url =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionByHash',
              params: [txHash],
              id: 1,
            }),
          })
            .then(response => response.json())
            .then(json => {
              if (!json.result) {
                throw new Error(JSON.stringify(json));
              }
              return json.result;
            }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof AggregateError) {
        // All promises were rejected
        for (const err of error.errors) {
          logger(`Failed to fetch tx ${txHash}: ${err}`);
        }
        throw new Error(`Failed to fetch transaction ${txHash}`);
      }
      throw error;
    }
  }
}
