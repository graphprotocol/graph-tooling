const cliTest = require('./util').cliTest

describe('Validation', () => {
  cliTest('Invalid manifest', 'validation/invalid-manifest')
  cliTest('Invalid ABIs', 'validation/invalid-abis')
  cliTest('Event not found in ABI', 'validation/event-not-found')
  cliTest('Missing entity "id" field', 'validation/missing-entity-id')
  cliTest('Invalid entity field types', 'validation/invalid-entity-field-types')
  cliTest('Invalid contract addresses', 'validation/invalid-contract-addresses')
})
