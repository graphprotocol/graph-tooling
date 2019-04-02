const cliTest = require('./util').cliTest

describe('Validation', () => {
  cliTest(
    'Invalid subgraph manifest',
    ['codegen', '--skip-migrations'],
    'validation/invalid-manifest',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'ABI not found in data source',
    ['codegen', '--skip-migrations'],
    'validation/abi-not-found',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'Invalid ABI files',
    ['codegen', '--skip-migrations'],
    'validation/invalid-abis',
    { exitCode: 1 },
  )
  cliTest(
    'Event not found in ABI',
    ['codegen', '--skip-migrations'],
    'validation/event-not-found',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'Missing entity "id" field',
    ['codegen', '--skip-migrations'],
    'validation/missing-entity-id',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'Invalid entity field types',
    ['codegen', '--skip-migrations'],
    'validation/invalid-entity-field-types',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'Invalid contract addresses',
    ['codegen', '--skip-migrations'],
    'validation/invalid-contract-addresses',
  )
  cliTest(
    'Entity field arguments',
    ['codegen', '--skip-migrations'],
    'validation/entity-field-args',
    {
      exitCode: 1,
    },
  )
  cliTest(
    'Example values found in manifest',
    ['codegen', '--skip-migrations'],
    'validation/example-values-found',
    { exitCode: 0 },
  )
  cliTest(
    'Source without address is valid',
    ['codegen', '--skip-migrations'],
    'validation/source-without-address-is-valid',
    {
      exitCode: 0,
    },
  )
})
