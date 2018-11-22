const path = require('path')
const spawn = require('spawn-command')

const runGraphCli = async (args = [], cwd = process.cwd()) => {
  // Resolve the path to graph.js
  let graphCli = path.join(__dirname, '..', '..', 'graph.js')

  // Make sure to set an absolute working directory
  cwd = cwd[0] !== '/' ? path.resolve(__dirname, cwd) : cwd

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const command = `${graphCli} ${args.join(' ')}`
    const child = spawn(command, { cwd })

    child.on('error', error => {
      reject(error)
    })

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('exit', exitCode => {
      resolve([exitCode, stdout, stderr])
    })
  })
}

describe('Validation', () => {
  test('Invalid manifest', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/invalid-manifest'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch('Path: specVersion\n  No value provided')
    expect(stdout).toMatch(
      'Path: schema > file\n  File does not exist: ./non-existent.grapqhl'
    )
    expect(stdout).toMatch(
      'Path: dataSources > 0 > name\n  Expected string, found number:\n  5'
    )
    expect(stdout).toMatch('Path: dataSources > 0\n  Unexpected key in map: abis')
    expect(stdout).toMatch(
      'Path: dataSources > 0 > mapping\n' +
        '  Expected map, found list:\n' +
        '  - 12\n' +
        '  - 13\n' +
        '  - 14'
    )
  })

  test('Invalid ABIs', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/invalid-abis'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch(/No valid ABI in file .+\/InvalidAbi.json/)
  })

  test('Event not found in ABI', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/event-not-found'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch(
      'Event with signature ExampleEvent(string,uint256) not ' +
        "present in ABI 'ExampleContract'. Candidates: ExampleEvent(string)"
    )
  })

  test('Missing entity "id" field', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/missing-entity-id'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch("Entity type 'MyEntity': Missing field: id: ID!")
  })

  test('Invalid entity field types', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/invalid-entity-field-types'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'isSet1': Unknown type 'bool'. Did you mean 'Boolean'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'isSet2': Unknown type 'boolean'. Did you mean 'Boolean'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'isSet3': Unknown type 'Bool'. Did you mean 'Boolean'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'address1': Unknown type 'Address'. Did you mean 'Bytes'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'address2': Unknown type 'address'. Did you mean 'Bytes'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'a': Unknown type 'uint256'. Did you mean 'BigInt'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'b': Unknown type 'int256'. Did you mean 'BigInt'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'c': Unknown type 'uint128'. Did you mean 'BigInt'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'd': Unknown type 'int128'. Did you mean 'BigInt'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'x': Unknown type 'float'. Did you mean 'Float'?"
    )
    expect(stdout).toMatch(
      "Type 'MyEntity', field 'y': Unknown type 'int'. Did you mean 'Int'?"
    )
    expect(stdout).toMatch("Type 'MyEntity', field 'references': Unknown type 'Foo'")
  })

  test('Invalid contract addresses', async () => {
    let [exitCode, stdout, _] = await runGraphCli(
      ['codegen'],
      './validation/invalid-contract-addresses'
    )
    expect(exitCode).toBe(1)
    expect(stdout).toMatch(
      'Path: dataSources > 0 > source > address\n  ' +
        'Contract address must have length 40 (or 42 if prefixed with 0x) ' +
        'but has length 41: 22843e74c59580b3eaf6c233fa67d8b7c561a835a'
    )
    expect(stdout).toMatch(
      'Path: dataSources > 1 > source > address\n  ' +
        'Contract address is not a hexadecimal string'
    )
    expect(stdout).toMatch(
      'Path: dataSources > 2 > source > address\n  ' +
        'Contract address must have length 40 (or 42 if prefixed with 0x) ' +
        'but has length 43: 0x22843e74c59580b3eaf6c233fa67d8b7c561a835a'
    )
  })
})
