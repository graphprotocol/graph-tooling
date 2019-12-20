const immutable = require('immutable')

/**
 * ethereum.Value -> AssemblyScript conversions
 */
const ETHEREUM_VALUE_TO_ASSEMBLYSCRIPT = [
  // Scalar values

  ['address', 'Address', code => `${code}.toAddress()`],
  ['bool', 'boolean', code => `${code}.toBoolean()`],
  ['byte', 'Bytes', code => `${code}.toBytes()`],
  [
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?$/,
    'Bytes',
    code => `${code}.toBytes()`,
  ],
  [/^int(8|16|24|32)$/, 'i32', code => `${code}.toI32()`],
  [/^uint(8|16|24)$/, 'i32', code => `${code}.toI32()`],
  ['uint32', 'BigInt', code => `${code}.toBigInt()`],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    'BigInt',
    code => `${code}.toBigInt()`,
  ],
  ['string', 'string', code => `${code}.toString()`],

  // Arrays

  [/^address\[([0-9]+)?\]$/, 'Array<Address>', code => `${code}.toAddressArray()`],
  [/^bool\[([0-9]+)?\]$/, 'Array<boolean>', code => `${code}.toBooleanArray()`],
  [/^byte\[([0-9]+)?\]$/, 'Array<Bytes>', code => `${code}.toBytesArray()`],
  [
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?\[([0-9]+)?\]$/,
    'Array<Bytes>',
    code => `${code}.toBytesArray()`,
  ],
  [/^int(8|16|24|32)\[([0-9]+)?\]$/, 'Array<i32>', code => `${code}.toI32Array()`],
  [/^uint(8|16|24)\[([0-9]+)?\]$/, 'Array<i32>', code => `${code}.toI32Array()`],
  [/^uint32\[([0-9]+)?\]$/, 'Array<BigInt>', code => `${code}.toBigIntArray()`],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    'Array<BigInt>',
    code => `${code}.toBigIntArray()`,
  ],
  [/^string\[([0-9]+)?\]$/, 'Array<string>', code => `${code}.toStringArray()`],

  // Tuples

  ['tuple', 'ethereum.Tuple', code => `${code}.toTuple()`],
  [
    /^tuple\[([0-9]+)?\]$/,
    'Array<ethereum.Tuple>',
    (code, type) => `${code}.toTupleArray<${type}>()`,
  ],
]

/**
 * AssemblyScript -> ethereum.Value conversions
 *
 * Note: The order and patterns for conversions in this direction differ slightly
 * from ethereum.Value -> AssemblyScript, which is why there is a separate table
 * for them.
 */
const ASSEMBLYSCRIPT_TO_ETHEREUM_VALUE = [
  // Scalar values

  ['Address', 'address', code => `ethereum.Value.fromAddress(${code})`],
  ['boolean', 'bool', code => `ethereum.Value.fromBoolean(${code})`],
  ['Bytes', 'byte', code => `ethereum.Value.fromFixedBytes(${code})`],
  ['Bytes', 'bytes', code => `ethereum.Value.fromBytes(${code})`],
  [
    'Bytes',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)$/,
    code => `ethereum.Value.fromFixedBytes(${code})`,
  ],
  ['i32', /^int(8|16|24|32)$/, code => `ethereum.Value.fromI32(${code})`],
  [
    'i32',
    /^uint(8|16|24)$/,
    code => `ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(${code}))`,
  ],
  [
    'BigInt',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    code => `ethereum.Value.fromSignedBigInt(${code})`,
  ],
  [
    'BigInt',
    /^uint(32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    code => `ethereum.Value.fromUnsignedBigInt(${code})`,
  ],
  ['string', 'string', code => `ethereum.Value.fromString(${code})`],

  // Arrays

  [
    'Array<Address>',
    /^address\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromAddressArray(${code})`,
  ],
  [
    'Array<boolean>',
    /^bool\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromBooleanArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /^byte\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromFixedBytesArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /bytes\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromBytesArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromFixedBytesArray(${code})`,
  ],
  [
    'Array<i32>',
    /^int(8|16|24|32)\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromI32Array(${code})`,
  ],
  [
    'Array<i32>',
    /^uint(8|16|24)\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromI32Array(${code})`,
  ],
  [
    'Array<BigInt>',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromSignedBigIntArray(${code})`,
  ],
  [
    'Array<BigInt>',
    /^uint(32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromUnsignedBigIntArray(${code})`,
  ],
  [
    'Array<string>',
    /^string\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromStringArray(${code})`,
  ],
  ['Tuple', 'tuple', code => `ethereum.Value.fromTuple(${code})`],
  [
    'Array<Tuple>',
    /^tuple\[([0-9]+)?\]$/,
    code => `ethereum.Value.fromTupleArray(${code})`,
  ],
]

/**
 * Value -> AssemblyScript conversions
 */
const VALUE_TO_ASSEMBLYSCRIPT = [
  // Arrays

  ['[Bytes]', 'Array<Bytes>', code => `${code}.toBytesArray()`],
  ['[Boolean]', 'Array<boolean>', code => `${code}.toBooleanArray()`],
  ['[Int]', 'Array<i32>', code => `${code}.toI32Array()`],
  ['[BigInt]', 'Array<BigInt>', code => `${code}.toBigIntArray()`],
  ['[ID]', 'Array<string>', code => `${code}.toStringArray()`],
  ['[String]', 'Array<string>', code => `${code}.toStringArray()`],
  ['[BigDecimal]', 'Array<BigDecimal>', code => `${code}.toBigDecimalArray()`],
  [/\[.*\]/, 'Array<string>', code => `${code}.toStringArray()`],

  // Scalar values

  ['Bytes', 'Bytes', code => `${code}.toBytes()`],
  ['Boolean', 'boolean', code => `${code}.toBoolean()`],
  ['Int', 'i32', code => `${code}.toI32()`],
  ['BigInt', 'BigInt', code => `${code}.toBigInt()`],
  ['ID', 'string', code => `${code}.toString()`],
  ['String', 'string', code => `${code}.toString()`],
  ['BigDecimal', 'BigDecimal', code => `${code}.toBigDecimal()`],
  [/.*/, 'string', code => `${code}.toString()`],
]

/**
 * AssemblyScript -> Value conversions
 *
 * Note: The order and patterns for conversions in this direction differ slightly
 * from Value -> AssemblyScript, which is why there is a separate table
 * for them.
 */
const ASSEMBLYSCRIPT_TO_VALUE = [
  // Arrays

  ['Array<Address>', '[Bytes]', code => `Value.fromBytesArray(${code})`],
  ['Array<Bytes>', '[Bytes]', code => `Value.fromBytesArray(${code})`],
  ['Array<boolean>', '[Boolean]', code => `Value.fromBooleanArray(${code})`],
  ['Array<i32>', '[Int]', code => `Value.fromI32Array(${code})`],
  ['Array<BigInt>', '[BigInt]', code => `Value.fromBigIntArray(${code})`],
  ['Array<string>', '[String]', code => `Value.fromStringArray(${code})`],
  ['Array<string>', '[ID]', code => `Value.fromStringArray(${code})`],
  ['Array<BigDecimal>', '[BigDecimal]', code => `Value.fromBigDecimalArray(${code})`],
  ['Array<string>', /\[.*\]/, code => `Value.fromStringArray(${code})`],

  // Scalar values

  ['Address', 'Bytes', code => `Value.fromBytes(${code})`],
  ['Bytes', 'Bytes', code => `Value.fromBytes(${code})`],
  ['boolean', 'Boolean', code => `Value.fromBoolean(${code})`],
  ['i32', 'Int', code => `Value.fromI32(${code})`],
  ['BigInt', 'BigInt', code => `Value.fromBigInt(${code})`],
  ['string', 'String', code => `Value.fromString(${code})`],
  ['string', 'ID', code => `Value.fromString(${code})`],
  ['BigDecimal', 'BigDecimal', code => `Value.fromBigDecimal(${code})`],
  ['string', /.*/, code => `Value.fromString(${code})`],
]

/**
 * Type conversions
 */
module.exports = immutable.fromJS({
  ethereum: {
    AssemblyScript: ETHEREUM_VALUE_TO_ASSEMBLYSCRIPT,
  },
  AssemblyScript: {
    ethereum: ASSEMBLYSCRIPT_TO_ETHEREUM_VALUE,
    Value: ASSEMBLYSCRIPT_TO_VALUE,
  },
  Value: {
    AssemblyScript: VALUE_TO_ASSEMBLYSCRIPT,
  },
})
