export const source = ({ contract }: { contract: string }) => `
      owner: '${contract}'`;

export const mapping = () => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - Block
        - Transaction
      blockHandlers:
        - handler: handleBlock
      transactionHandlers:
        - handler: handleTx
      file: ./src/mapping.ts`;
