const codegen = require('.')

describe('EthereumValue -> AssemblyScript', () => {
  // Scalar values

  test('address -> Address', () => {
    expect(codegen.ethereumValueToAsc('x', 'address')).toBe('x.toAddress()')
    expect(codegen.ascTypeForEthereum('address')).toBe('Address')
  })

  test('bool -> boolean', () => {
    expect(codegen.ethereumValueToAsc('x', 'bool')).toBe('x.toBoolean()')
    expect(codegen.ascTypeForEthereum('bool')).toBe('boolean')
  })

  test('byte -> Bytes', () => {
    expect(codegen.ethereumValueToAsc('x', 'byte')).toBe('x.toBytes()')
    expect(codegen.ascTypeForEthereum('byte')).toBe('Bytes')
  })

  test('bytes -> Bytes', () => {
    expect(codegen.ethereumValueToAsc('x', 'bytes')).toBe('x.toBytes()')
    expect(codegen.ascTypeForEthereum('bytes')).toBe('Bytes')
  })

  test('bytes0 (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes0')).toThrow()
  })

  test('bytes1..32 -> Bytes', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueToAsc('x', `bytes${i}`)).toBe('x.toBytes()')
      expect(codegen.ascTypeForEthereum(`bytes${i}`)).toBe('Bytes')
    }
  })

  test('bytes33 (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes33')).toThrow()
  })

  test('int8..32, uint8..uint24 -> i32', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}`)).toBe('x.toI32()')
      expect(codegen.ascTypeForEthereum(`int${i}`)).toBe('i32')
    }
    for (let i = 8; i <= 24; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `uint${i}`)).toBe('x.toI32()')
      expect(codegen.ascTypeForEthereum(`uint${i}`)).toBe('i32')
    }
  })

  test('uint32 -> BigInt', () => {
    expect(codegen.ethereumValueToAsc('x', `uint32`)).toBe('x.toBigInt()')
    expect(codegen.ascTypeForEthereum('uint32')).toBe('BigInt')
  })

  test('(u)int40..256 -> BigInt', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}`)).toBe('x.toBigInt()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}`)).toBe('x.toBigInt()')
      expect(codegen.ascTypeForEthereum(`int${i}`)).toBe('BigInt')
      expect(codegen.ascTypeForEthereum(`uint${i}`)).toBe('BigInt')
    }
  })

  test('string -> String', () => {
    expect(codegen.ethereumValueToAsc('x', 'string')).toBe('x.toString()')
    expect(codegen.ascTypeForEthereum('string')).toBe('string')
  })

  // Array values

  test('address[*] -> Array<Address>', () => {
    expect(codegen.ethereumValueToAsc('x', 'address[]')).toBe('x.toAddressArray()')
    expect(codegen.ethereumValueToAsc('x', 'address[1]')).toBe('x.toAddressArray()')
    expect(codegen.ethereumValueToAsc('x', 'address[123]')).toBe('x.toAddressArray()')
    expect(codegen.ascTypeForEthereum('address[]')).toBe('Array<Address>')
    expect(codegen.ascTypeForEthereum('address[1]')).toBe('Array<Address>')
    expect(codegen.ascTypeForEthereum('address[123]')).toBe('Array<Address>')
  })

  test('bool[*] -> Array<boolean>', () => {
    expect(codegen.ethereumValueToAsc('x', 'bool[]')).toBe('x.toBooleanArray()')
    expect(codegen.ethereumValueToAsc('x', 'bool[5]')).toBe('x.toBooleanArray()')
    expect(codegen.ethereumValueToAsc('x', 'bool[275]')).toBe('x.toBooleanArray()')
    expect(codegen.ascTypeForEthereum('bool[]')).toBe('Array<boolean>')
    expect(codegen.ascTypeForEthereum('bool[5]')).toBe('Array<boolean>')
    expect(codegen.ascTypeForEthereum('bool[275]')).toBe('Array<boolean>')
  })

  test('byte[*] -> Array<Bytes>', () => {
    expect(codegen.ethereumValueToAsc('x', 'byte[]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'byte[7]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'byte[553]')).toBe('x.toBytesArray()')
    expect(codegen.ascTypeForEthereum('byte[]')).toBe('Array<Bytes>')
    expect(codegen.ascTypeForEthereum('byte[7]')).toBe('Array<Bytes>')
    expect(codegen.ascTypeForEthereum('byte[553]')).toBe('Array<Bytes>')
  })

  test('bytes[*] -> Array<Bytes>', () => {
    expect(codegen.ethereumValueToAsc('x', 'bytes[]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'bytes[14]')).toBe('x.toBytesArray()')
    expect(codegen.ethereumValueToAsc('x', 'bytes[444]')).toBe('x.toBytesArray()')
    expect(codegen.ascTypeForEthereum('bytes[]')).toBe('Array<Bytes>')
    expect(codegen.ascTypeForEthereum('bytes[14]')).toBe('Array<Bytes>')
    expect(codegen.ascTypeForEthereum('bytes[444]')).toBe('Array<Bytes>')
  })

  test('bytes0[*] (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[83]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes0[123]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes0[]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes0[83]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes0[123]')).toThrow()
  })

  test('bytes1..32[*] -> Array<Bytes>', () => {
    for (let i = 1; i <= 32; i++) {
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[]`)).toBe('x.toBytesArray()')
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[7]`)).toBe('x.toBytesArray()')
      expect(codegen.ethereumValueToAsc('x', `bytes${i}[432]`)).toBe('x.toBytesArray()')
      expect(codegen.ascTypeForEthereum(`bytes${i}[]`)).toBe('Array<Bytes>')
      expect(codegen.ascTypeForEthereum(`bytes${i}[7]`)).toBe('Array<Bytes>')
      expect(codegen.ascTypeForEthereum(`bytes${i}[432]`)).toBe('Array<Bytes>')
    }
  })

  test('bytes33[*] (invalid)', () => {
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[58]')).toThrow()
    expect(() => codegen.ethereumValueToAsc('x', 'bytes33[394]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes33[]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes33[58]')).toThrow()
    expect(() => codegen.ascTypeForEthereum('bytes33[394]')).toThrow()
  })

  test('int8..32[*], uint8..24[*] -> Array<i32>', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}[]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[6]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[4638]`)).toBe('x.toI32Array()')
      expect(codegen.ascTypeForEthereum(`int${i}[]`)).toBe('Array<i32>')
      expect(codegen.ascTypeForEthereum(`int${i}[6]`)).toBe('Array<i32>')
      expect(codegen.ascTypeForEthereum(`int${i}[4638]`)).toBe('Array<i32>')
    }
    for (let i = 8; i <= 24; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `uint${i}[]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[6]`)).toBe('x.toI32Array()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[593]`)).toBe('x.toI32Array()')
      expect(codegen.ascTypeForEthereum(`uint${i}[]`)).toBe('Array<i32>')
      expect(codegen.ascTypeForEthereum(`uint${i}[6]`)).toBe('Array<i32>')
      expect(codegen.ascTypeForEthereum(`uint${i}[593]`)).toBe('Array<i32>')
    }
  })

  test('uint32[*] -> Array<BigInt>', () => {
    expect(codegen.ethereumValueToAsc('x', `uint32[]`)).toBe('x.toBigIntArray()')
    expect(codegen.ethereumValueToAsc('x', `uint32[6]`)).toBe('x.toBigIntArray()')
    expect(codegen.ethereumValueToAsc('x', `uint32[593]`)).toBe('x.toBigIntArray()')
    expect(codegen.ascTypeForEthereum(`uint32[]`)).toBe('Array<BigInt>')
    expect(codegen.ascTypeForEthereum(`uint32[6]`)).toBe('Array<BigInt>')
    expect(codegen.ascTypeForEthereum(`uint32[593]`)).toBe('Array<BigInt>')
  })

  test('(u)int40..256[*] -> Array<BigInt>', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueToAsc('x', `int${i}[]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[7]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `int${i}[6833]`)).toBe('x.toBigIntArray()')
      expect(codegen.ascTypeForEthereum(`int${i}[]`)).toBe('Array<BigInt>')
      expect(codegen.ascTypeForEthereum(`int${i}[7]`)).toBe('Array<BigInt>')
      expect(codegen.ascTypeForEthereum(`int${i}[6833]`)).toBe('Array<BigInt>')

      expect(codegen.ethereumValueToAsc('x', `uint${i}[]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[23]`)).toBe('x.toBigIntArray()')
      expect(codegen.ethereumValueToAsc('x', `uint${i}[467]`)).toBe('x.toBigIntArray()')
      expect(codegen.ascTypeForEthereum(`uint${i}[]`)).toBe('Array<BigInt>')
      expect(codegen.ascTypeForEthereum(`uint${i}[23]`)).toBe('Array<BigInt>')
      expect(codegen.ascTypeForEthereum(`uint${i}[467]`)).toBe('Array<BigInt>')
    }
  })

  test('string[*] -> Array<string>', () => {
    expect(codegen.ethereumValueToAsc('x', 'string[]')).toBe('x.toStringArray()')
    expect(codegen.ethereumValueToAsc('x', 'string[4]')).toBe('x.toStringArray()')
    expect(codegen.ethereumValueToAsc('x', 'string[754]')).toBe('x.toStringArray()')
    expect(codegen.ascTypeForEthereum('string[]')).toBe('Array<string>')
    expect(codegen.ascTypeForEthereum('string[4]')).toBe('Array<string>')
    expect(codegen.ascTypeForEthereum('string[754]')).toBe('Array<string>')
  })
})

describe('AssemblyScript -> EthereumValue', () => {
  // Scalar values

  test('Address -> address', () => {
    expect(codegen.ethereumValueFromAsc('x', 'address')).toBe(
      'EthereumValue.fromAddress(x)',
    )
  })

  test('boolean -> bool', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bool')).toBe('EthereumValue.fromBoolean(x)')
  })

  test('Bytes -> byte', () => {
    expect(codegen.ethereumValueFromAsc('x', 'byte')).toBe(
      'EthereumValue.fromFixedBytes(x)',
    )
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
        'EthereumValue.fromFixedBytes(x)',
      )
    }
  })

  test('Bytes -> bytes33 (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33')).toThrow()
  })

  test('i32 -> int8..32, uint8..24', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}`)).toBe(
        `EthereumValue.fromI32(x)`,
      )
    }
    for (let i = 8; i <= 24; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `uint${i}`)).toBe(
        `EthereumValue.fromUnsignedBigInt(BigInt.fromI32(x))`,
      )
    }
  })

  test('BigInt -> uint32', () => {
    expect(codegen.ethereumValueFromAsc('x', `uint32`)).toBe(
      `EthereumValue.fromUnsignedBigInt(x)`,
    )
  })

  test('BigInt -> (u)int40..256', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}`)).toBe(
        `EthereumValue.fromSignedBigInt(x)`,
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}`)).toBe(
        `EthereumValue.fromUnsignedBigInt(x)`,
      )
    }
  })

  test('String -> string', () => {
    expect(codegen.ethereumValueFromAsc('x', 'string')).toBe(
      'EthereumValue.fromString(x)',
    )
  })

  // Array values

  test('Array<Address> -> address[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'address[]')).toBe(
      'EthereumValue.fromAddressArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'address[1]')).toBe(
      'EthereumValue.fromAddressArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'address[123]')).toBe(
      'EthereumValue.fromAddressArray(x)',
    )
  })

  test('Array<boolean> -> bool[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bool[]')).toBe(
      'EthereumValue.fromBooleanArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'bool[5]')).toBe(
      'EthereumValue.fromBooleanArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'bool[275]')).toBe(
      'EthereumValue.fromBooleanArray(x)',
    )
  })

  test('Array<Bytes> -> byte[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'byte[]')).toBe(
      'EthereumValue.fromFixedBytesArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'byte[7]')).toBe(
      'EthereumValue.fromFixedBytesArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'byte[553]')).toBe(
      'EthereumValue.fromFixedBytesArray(x)',
    )
  })

  test('Array<Bytes> -> bytes[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'bytes[]')).toBe(
      'EthereumValue.fromBytesArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'bytes[14]')).toBe(
      'EthereumValue.fromBytesArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'bytes[444]')).toBe(
      'EthereumValue.fromBytesArray(x)',
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
        'EthereumValue.fromFixedBytesArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}[7]`)).toBe(
        'EthereumValue.fromFixedBytesArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `bytes${i}[432]`)).toBe(
        'EthereumValue.fromFixedBytesArray(x)',
      )
    }
  })

  test('bytes33[*] (invalid)', () => {
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[58]')).toThrow()
    expect(() => codegen.ethereumValueFromAsc('x', 'bytes33[394]')).toThrow()
  })

  test('Array<i32> -> int8..32[*], uint8..24[*]', () => {
    for (let i = 8; i <= 32; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}[]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[6]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[4638]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
    }

    for (let i = 8; i <= 24; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[6]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[593]`)).toBe(
        'EthereumValue.fromI32Array(x)',
      )
    }
  })

  test('Array<BigInt> -> uint32[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', `uint32[]`)).toBe(
      'EthereumValue.fromUnsignedBigIntArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', `uint32[6]`)).toBe(
      'EthereumValue.fromUnsignedBigIntArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', `uint32[593]`)).toBe(
      'EthereumValue.fromUnsignedBigIntArray(x)',
    )
  })

  test('Array<BigInt> -> (u)int40..256[*]', () => {
    for (let i = 40; i <= 256; i += 8) {
      expect(codegen.ethereumValueFromAsc('x', `int${i}[]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[7]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `int${i}[6833]`)).toBe(
        'EthereumValue.fromSignedBigIntArray(x)',
      )

      expect(codegen.ethereumValueFromAsc('x', `uint${i}[]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[23]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)',
      )
      expect(codegen.ethereumValueFromAsc('x', `uint${i}[467]`)).toBe(
        'EthereumValue.fromUnsignedBigIntArray(x)',
      )
    }
  })

  test('Array<String> -> string[*]', () => {
    expect(codegen.ethereumValueFromAsc('x', 'string[]')).toBe(
      'EthereumValue.fromStringArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'string[4]')).toBe(
      'EthereumValue.fromStringArray(x)',
    )
    expect(codegen.ethereumValueFromAsc('x', 'string[754]')).toBe(
      'EthereumValue.fromStringArray(x)',
    )
  })
})

describe('Value -> AssemblyScript', () => {
  test('BigDecimal -> BigDecimal', () => {
    expect(codegen.valueToAsc('x', 'BigDecimal')).toBe('x.toBigDecimal()')
  })

  test('[BigDecimal] -> Array<BigDecimal>', () => {
    expect(codegen.valueToAsc('x', '[BigDecimal]')).toBe('x.toBigDecimalArray()')
  })

  test('String -> string', () => {
    expect(codegen.valueToAsc('x', 'string')).toBe('x.toString()')
  })

  test('[String] -> Array<string>', () => {
    expect(codegen.valueToAsc('x', '[String]')).toBe('x.toStringArray()')
  })
})

describe('AssemblyScript -> Value', () => {
  test('BigDecimal -> BigDecimal', () => {
    expect(codegen.valueFromAsc('x', 'BigDecimal')).toBe('Value.fromBigDecimal(x)')
    expect(codegen.valueTypeForAsc('BigDecimal')).toBe('BigDecimal')
  })

  test('Array<BigDecimal> -> [BigDecimal]', () => {
    expect(codegen.valueFromAsc('x', '[BigDecimal]')).toBe('Value.fromBigDecimalArray(x)')
    expect(codegen.valueTypeForAsc('Array<BigDecimal>')).toBe('[BigDecimal]')
  })

  test('string -> String', () => {
    expect(codegen.valueFromAsc('x', 'String')).toBe('Value.fromString(x)')
    expect(codegen.valueTypeForAsc('string')).toBe('String')
  })

  test('Array<string> -> [String]', () => {
    expect(codegen.valueFromAsc('x', '[String]')).toBe('Value.fromStringArray(x)')
    expect(codegen.valueTypeForAsc('Array<string>')).toBe('[String]')
  })
})
