import { strings } from 'gluegun';

export const source = ({ contract }: { contract: string }) => `
      account: '${contract}'`;

export const mapping = ({ contractName }: { contractName: string }) => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      receiptHandlers:
        - handler: handleReceipt
      file: ./src/${strings.kebabCase(contractName)}.ts`;
