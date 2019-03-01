const cliTest = require('./util').cliTest

describe('Validation', () => {
  cliTest('Invalid subgraph manifest', ['codegen'], 'validation/invalid-manifest', {
    exitCode: 1,
  })
  cliTest('ABI not found in data source', ['codegen'], 'validation/abi-not-found', {
    exitCode: 1,
  })
  cliTest('Invalid ABI files', ['codegen'], 'validation/invalid-abis', { exitCode: 1 })
  cliTest('Event not found in ABI', ['codegen'], 'validation/event-not-found', {
    exitCode: 1,
  })
  cliTest('Missing entity "id" field', ['codegen'], 'validation/missing-entity-id', {
    exitCode: 1,
  })
  cliTest(
    'Invalid entity field types',
    ['codegen'],
    'validation/invalid-entity-field-types',
    {
      exitCode: 1,
    }
  )
  cliTest(
    'Invalid contract addresses',
    ['codegen'],
    'validation/invalid-contract-addresses'
  )
  cliTest('Entity field arguments', ['codegen'], 'validation/entity-field-args', {
    exitCode: 1,
  })
  cliTest(
    'Example values found in manifest',
    ['codegen'],
    'validation/example-values-found',
    { exitCode: 1 }
  )
})
