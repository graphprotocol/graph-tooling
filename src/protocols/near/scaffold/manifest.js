const source = ({ contract }) => `
      account: '${contract}'`

const mapping = () => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      receiptHandlers:
        - handler: handleReceipt
      file: ./src/mapping.ts`

module.exports = {
  source,
  mapping,
}
