const cliTest = require('./util').cliTest

describe('Validation', () => {
  cliTest('Invalid subgraph manifest', 'validation/invalid-manifest', { exitCode: 1 })
  cliTest('ABI not found in data source', 'validation/abi-not-found', { exitCode: 1 })
  cliTest('Invalid ABI files', 'validation/invalid-abis', { exitCode: 1 })
  cliTest('Event not found in ABI', 'validation/event-not-found', { exitCode: 1 })
  cliTest('Missing entity "id" field', 'validation/missing-entity-id', { exitCode: 1 })
  cliTest('Invalid entity field types', 'validation/invalid-entity-field-types', {
    exitCode: 1,
  })
  cliTest('Invalid contract addresses', 'validation/invalid-contract-addresses')
  cliTest('Entity field arguments', 'validation/entity-field-args', { exitCode: 1 })
  cliTest('Example values found in manifest', 'validation/example-values-found', { exitCode: 1 })
})
