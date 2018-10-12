const immutable = require('immutable')

/**
 * EthereumValue -> AssemblyScript conversions
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
  [/^uint(8|16|24|32)$/, 'u32', code => `${code}.toU32()`],
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
  [/^uint(8|16|24|32)\[([0-9]+)?\]$/, 'Array<u32>', code => `${code}.toU32Array()`],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    'Array<BigInt>',
    code => `${code}.toBigIntArray()`,
  ],
  [/^string\[([0-9]+)?\]$/, 'Array<String>', code => `${code}.toStringArray()`],
]

/**
 * AssemblyScript -> EthereumValue conversions
 */
const ASSEMBLYSCRIPT_TO_ETHEREUM_VALUE = [
  // Scalar values

  ['Address', 'address', code => `EthereumValue.fromAddress(${code})`],
  ['boolean', 'bool', code => `EthereumValue.fromBoolean(${code})`],
  ['Bytes', 'byte', code => `EthereumValue.fromBytes(${code})`],
  [
    'Bytes',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?$/,
    code => `EthereumValue.fromBytes(${code})`,
  ],
  ['i32', /^int(8|16|24|32)$/, code => `EthereumValue.fromI32(${code})`],
  ['u32', /^uint(8|16|24|32)$/, code => `EthereumValue.fromU32(${code})`],
  [
    'BigInt',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    code => `EthereumValue.fromSignedBigInt(${code})`,
  ],
  [
    'BigInt',
    /^uint(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    code => `EthereumValue.fromUnsignedBigInt(${code})`,
  ],
  ['string', 'string', code => `EthereumValue.fromString(${code})`],

  // Arrays

  [
    'Array<Address>',
    /^address\[([0-9]+)?\]$/,
    code => `EthereumValue.fromAddressArray(${code})`,
  ],
  [
    'Array<boolean>',
    /^bool\[([0-9]+)?\]$/,
    code => `EthereumValue.fromBooleanArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /^byte\[([0-9]+)?\]$/,
    code => `EthereumValue.fromBytesArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?\[([0-9]+)?\]$/,
    code => `EthereumValue.fromBytesArray(${code})`,
  ],
  [
    'Array<i32>',
    /^int(8|16|24|32)\[([0-9]+)?\]$/,
    code => `EthereumValue.fromI32Array(${code})`,
  ],
  [
    'Array<u32>',
    /^uint(8|16|24|32)\[([0-9]+)?\]$/,
    code => `EthereumValue.fromU32Array(${code})`,
  ],
  [
    'Array<BigInt>',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    code => `EthereumValue.fromSignedBigIntArray(${code})`,
  ],
  [
    'Array<BigInt>',
    /^uint(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    code => `EthereumValue.fromUnsignedBigIntArray(${code})`,
  ],
  [
    'Array<String>',
    /^string\[([0-9]+)?\]$/,
    code => `EthereumValue.fromStringArray(${code})`,
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
  ['[Int]', 'Array<u32>', code => `${code}.toU32Array()`],
  ['[BigInt]', 'Array<BigInt>', code => `${code}.toBigIntArray()`],
  ['[ID]', 'Array<string>', code => `${code}.toStringArray()`],
  ['[String]', 'Array<string>', code => `${code}.toStringArray()`],
  [/\[.*\]/, 'Array<string>', code => `${code}.toStringArray()`],

  // Scalar values

  ['Bytes', 'Bytes', code => `${code}.toBytes()`],
  ['Boolean', 'boolean', code => `${code}.toBoolean()`],
  ['Int', 'i32', code => `${code}.toI32()`],
  ['Int', 'u32', code => `${code}.toU32()`],
  ['BigInt', 'BigInt', code => `${code}.toBigInt()`],
  ['ID', 'string', code => `${code}.toString()`],
  ['String', 'string', code => `${code}.toString()`],
  [/.*/, 'string', code => `${code}.toString()`],
]

/**
 * AssemblyScript -> Value conversions
 */
const ASSEMBLYSCRIPT_TO_VALUE = [
  // Arrays

  ['Array<Bytes>', '[Bytes]', code => `Value.fromBytesArray(${code})`],
  ['Array<boolean>', '[Boolean]', code => `Value.fromBooleanArray(${code})`],
  ['Array<i32>', '[Int]', code => `Value.fromI32Array(${code})`],
  ['Array<u32>', '[Int]', code => `Value.fromU32Array(${code})`],
  ['Array<BigInt>', '[BigInt]', code => `Value.fromBigIntArray(${code})`],
  ['Array<string>', '[ID]', code => `Value.fromStringArray(${code})`],
  ['Array<string>', '[String]', code => `Value.fromStringArray(${code})`],
  ['Array<string>', /\[.*\]/, code => `Value.fromStringArray(${code})`],

  // Scalar values

  ['Bytes', 'Bytes', code => `Value.fromBytes(${code})`],
  ['boolean', 'Boolean', code => `Value.fromBoolean(${code})`],
  ['i32', 'Int', code => `Value.fromI32(${code})`],
  ['u32', 'Int', code => `Value.fromI32(${code})`],
  ['BigInt', 'BigInt', code => `Value.fromBigInt(${code})`],
  ['string', 'ID', code => `Value.fromString(${code})`],
  ['string', 'String', code => `Value.fromString(${code})`],
  ['string', /.*/, code => `Value.fromString(${code})`],
]

/**
 * Type conversions
 */
module.exports = immutable.fromJS({
  EthereumValue: {
    AssemblyScript: ETHEREUM_VALUE_TO_ASSEMBLYSCRIPT,
  },
  AssemblyScript: {
    EthereumValue: ASSEMBLYSCRIPT_TO_ETHEREUM_VALUE,
    Value: ASSEMBLYSCRIPT_TO_VALUE,
  },
  Value: {
    AssemblyScript: VALUE_TO_ASSEMBLYSCRIPT,
  },
})
