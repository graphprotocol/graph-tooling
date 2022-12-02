const source = () => `
      startBlock: 0`

const mapping = () => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      blockHandlers:
        - handler: handleBlock
      file: ./src/contract.ts`

module.exports = {
  source,
  mapping,
}
