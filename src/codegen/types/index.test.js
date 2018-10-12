const codegen = require('.')

describe('EthereumValue -> AssemblyScript', () => {
  // Scalar values

  test('address -> Address', () => {
    expect(codegen.ethereumValueToAsc('x', 'address')).toBe('x.toAddress()')
  })

  test('bool -> boolean', () => {
    expect(codegen.ethereumValueToAsc('x', 'bool')).toBe('x.toBoolean()')
  })

  test('byte -> Bytes', () => {
    expect(codegen.ethereumValueToAsc('x', 'byte')).toBe('x.toBytes()')
  })

  test('bytes -> Bytes', () => {
    expect(codegen.ethereumValueToAsc('x', 'bytes')).toBe('x.toBytes()')
  })

  test('bytes0 (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0')).toThrow()
  })

  test('bytes1..32 -> Bytes', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueToAsc('x', `bytes${i}`)).toBe('x.toBytes()')
    }
  })

  test('bytes33 (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33')).toThrow()
  })

  test('(u)int8..32 -> (u,i)32', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}`)).toBe('x.toI32()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}`)).toBe('x.toU32()')
    }
  })

  test('(u)int40...256 -> BigInt', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}`)).toBe('x.toBigInt()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}`)).toBe('x.toBigInt()')
    }
  })

  test('string -> String', () => {
    expect(codegen.ethereumValueToAsc('x', 'string')).toBe('x.toString()')
  })

  // Array values

  test('address[*] -> Array<Address>', () => {
    expect(codegen.ethereumValueToAsc('x', 'address[]')).toBe('x.toAddressArray()')
    expect(codegen.ethereumValueToAsc('x', 'address[1]')).toBe('x.toAddressArray()')
    expect(codegen.ethereumValueToAsc('x', 'address[123]')).toBe('x.toAddressArray()')
  })

  test('bool[*] -> Array<boolean>', () => {
    expect(codegen.ethereumValueToAsc('x', 'bool[]')).toBe('x.toBooleanArray()')
    expect(codegen.ethereumValueToAsc('x', 'bool[5]')).toBe('x.toBooleanArray()')
    expect(codegen.ethereumValueToAsc('x', 'bool[275]')).toBe('x.toBooleanArray()')
  })

  test('byte[*] -> Array<Bytes>', () => {
    expect(codegen.ethereumValueToAsc('x', 'byte[]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'byte[7]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'byte[553]')).toBe('x.toBytesArray()')
  })

  test('bytes[*] -> Array<Bytes>', () => {
    expect(codegen.ethereumValueToAsc('x', 'bytes[]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'bytes[14]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'bytes[444]')).toBe('x.toBytesArray()')
  })

  test('bytes0[*] (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[83]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[123]')).toThrow()
  })

  test('bytes1..32[*] -> Array<Bytes>', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[]`)).toBe('x.toBytesArray()')
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[7]`)).toBe('x.toBytesArray()')
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[432]`)).toBe('x.toBytesArray()')
    }
  })

  test('bytes33[*] (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[58]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[394]')).toThrow()
  })

  test('(u)int8..32[*] -> Array<(u,i)32>', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}[]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[6]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[4638]`)).toBe('x.toI32Array()')

      expect(codegen.ethereumValueToAsc('x', `uint${i}[]`)).toBe('x.toU32Array()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[6]`)).toBe('x.toU32Array()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[593]`)).toBe('x.toU32Array()')
    }
  })

  test('(u)int40...256[*] -> Array<BigInt>', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}[]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[7]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[6833]`)).toBe('x.toBigIntArray()')

      expect(codegen.ethereumValueToAsc('x', `uint${i}[]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[23]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[467]`)).toBe('x.toBigIntArray()')
    }
  })

  test('string[*] -> Array<String>', () => {
    expect(codegen.ethereumValueToAsc('x', 'string[]')).toBe('x.toStringArray()')
    expect(codegen.ethereumValueToAsc('x', 'string[4]')).toBe('x.toStringArray()')
    expect(codegen.ethereumValueToAsc('x', 'string[754]')).toBe('x.toStringArray()')
  })
})

describe('AssemblyScript -> EthereumValue', () => {
  // Scalar values

  test('Address -> address', () => {
    expect(codegen.ethereumValueFromAsc('x', 'address')).toBe(
      'EthereumValue.fromAddress(x)'
    )
  })

  test('boolean -> bool', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bool')).toBe('EthereumValue.fromBoolean(x)')
  })

  test('Bytes -> byte', () => {
    expect(codegen.ethereumValueFromAsc('x', 'byte')).toBe('EthereumValue.fromBytes(x)')
  })

  test('Bytes -> bytes', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bytes')).toBe('EthereumValue.fromBytes(x)')
  })

  test('Bytes -> bytes0 (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes0')).toThrow()
  })

  test('Bytes -> bytes1..32', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}`)).toBe(
        'EthereumValue.fromBytes(x)'
      )
    }
  })

  test('Bytes -> bytes33 (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33')).toThrow()
  })

  test('(u,i)32 -> (u)int8..32', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}`)).toBe(
        `EthereumValue.fromI32(x)`
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}`)).toBe(
        `EthereumValue.fromU32(x)`
      )
    }
  })

  test('BigInt -> (u)int40...256', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}`)).toBe(
        `EthereumValue.fromSignedBigInt(x)`
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}`)).toBe(
        `EthereumValue.fromUnsignedBigInt(x)`
      )
    }
  })

  test('String -> string', () => {
    expect(codegen.ethereumValueFromAsc('x', 'string')).toBe(
      'EthereumValue.fromString(x)'
    )
  })

  // Array values

  test('Array<Address> -> address[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'address[]')).toBe(
      'EthereumValue.fromAddressArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'address[1]')).toBe(
      'EthereumValue.fromAddressArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'address[123]')).toBe(
      'EthereumValue.fromAddressArray(x)'
    )
  })

  test('Array<boolean> -> bool[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bool[]')).toBe(
      'EthereumValue.fromBooleanArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'bool[5]')).toBe(
      'EthereumValue.fromBooleanArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'bool[275]')).toBe(
      'EthereumValue.fromBooleanArray(x)'
    )
  })

  test('Array<Bytes> -> byte[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'byte[]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'byte[7]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'byte[553]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
  })

  test('Array<Bytes> -> bytes[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bytes[]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'bytes[14]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'bytes[444]')).toBe(
      'EthereumValue.fromBytesArray(x)'
    )
  })

  test('bytes0[*] (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes0[]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes0[83]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes0[123]')).toThrow()
  })

  test('Array<Bytes> -> bytes1..32[*]', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}[]`)).toBe(
        'EthereumValue.fromBytesArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}[7]`)).toBe(
        'EthereumValue.fromBytesArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}[432]`)).toBe(
        'EthereumValue.fromBytesArray(x)'
      )
    }
  })

  test('bytes33[*] (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[58]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[394]')).toThrow()
  })

  test('Array<(u,i)32> -> (u)int8..32[*]', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}[]`)).toBe(
        'EthereumValue.fromI32Array(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[6]`)).toBe(
        'EthereumValue.fromI32Array(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[4638]`)).toBe(
        'EthereumValue.fromI32Array(x)'
      )

      expect(codegen.ethereumValueFromAsc('x', `uint${i}[]`)).toBe(
        'EthereumValue.fromU32Array(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[6]`)).toBe(
        'EthereumValue.fromU32Array(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[593]`)).toBe(
        'EthereumValue.fromU32Array(x)'
      )
    }
  })

  test('Array<BigInt> -> (u)int40...256[*]', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}[]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[7]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[6833]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)'
      )

      expect(codegen.ethereumValueFromAsc('x', `uint${i}[]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[23]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)'
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[467]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)'
      )
    }
  })

  test('Array<String> -> string[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'string[]')).toBe(
      'EthereumValue.fromStringArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'string[4]')).toBe(
      'EthereumValue.fromStringArray(x)'
    )
    expect(codegen.ethereumValueFromAsc('x', 'string[754]')).toBe(
      'EthereumValue.fromStringArray(x)'
    )
  })
})
