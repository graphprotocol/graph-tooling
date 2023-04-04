import { strings } from 'gluegun';
import { abiEvents } from '../../../scaffold/schema';
import ABI from '../abi';

export const source = ({
  contract,
  contractName,
  startBlock,
}: {
  contract: string;
  contractName: string;
  startBlock?: string;
}) =>
  startBlock
    ? `
      address: '${contract}'
      abi: ${contractName}
      startBlock: ${startBlock}`
    : `
      address: '${contract}'
      abi: ${contractName}`;

export const mapping = ({ abi, contractName }: { abi: ABI; contractName: string }) => `
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        ${abiEvents(abi)
          .map(
            event =>
              `- ${
                event.get('collision')
                  ? `${contractName}${event.get('_alias')}`
                  : event.get('_alias')
              }`,
          )
          .join('\n        ')}
      abis:
        - name: ${contractName}
          file: ./abis/${contractName}.json
      eventHandlers:
        ${abiEvents(abi)
          .map(
            event => `
        - event: ${ABI.eventSignature(event)}
          handler: handle${event.get('_alias')}`,
          )
          .join('')}
      file: ./src/${strings.kebabCase(contractName)}.ts`;
