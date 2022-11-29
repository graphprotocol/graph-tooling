const { strings } = require('gluegun')

const source = ({ contract }) => `
      account: '${contract}'`

const mapping = ({ contractName }) => `
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEntity
      receiptHandlers:
        - handler: handleReceipt
      file: ./src/${strings.kebabCase(contractName)}.ts`

module.exports = {
  source,
  mapping,
}
