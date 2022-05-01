const source = ({ contract }) => `
      owner: '${contract}'`

const mapping = () => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - Block
        - Transaction
      blockHandlers:
        - handler: handleBlock
      transactionHandlers:
        - handler: handleTx
      file: ./src/mapping.ts`

module.exports = {
  source,
  mapping,
}
