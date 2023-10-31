import immutable from 'immutable';

/**
 * ethereum.Value -> AssemblyScript conversions
 */
const ETHEREUM_VALUE_TO_ASSEMBLYSCRIPT = [
  // Scalar values

  ['address', 'Address', (code: any) => `${code}.toAddress()`],
  ['bool', 'boolean', (code: any) => `${code}.toBoolean()`],
  ['byte', 'Bytes', (code: any) => `${code}.toBytes()`],
  [
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?$/,
    'Bytes',
    (code: any) => `${code}.toBytes()`,
  ],
  [/^int(8|16|24|32)$/, 'i32', (code: any) => `${code}.toI32()`],
  [/^uint(8|16|24)$/, 'i32', (code: any) => `${code}.toI32()`],
  ['uint32', 'BigInt', (code: any) => `${code}.toBigInt()`],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    'BigInt',
    (code: any) => `${code}.toBigInt()`,
  ],
  ['string', 'string', (code: any) => `${code}.toString()`],

  // Arrays

  [/^address\[([0-9]+)?\]$/, 'Array<Address>', (code: any) => `${code}.toAddressArray()`],
  [/^bool\[([0-9]+)?\]$/, 'Array<boolean>', (code: any) => `${code}.toBooleanArray()`],
  [/^byte\[([0-9]+)?\]$/, 'Array<Bytes>', (code: any) => `${code}.toBytesArray()`],
  [
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?\[([0-9]+)?\]$/,
    'Array<Bytes>',
    (code: any) => `${code}.toBytesArray()`,
  ],
  [/^int(8|16|24|32)\[([0-9]+)?\]$/, 'Array<i32>', (code: any) => `${code}.toI32Array()`],
  [/^uint(8|16|24)\[([0-9]+)?\]$/, 'Array<i32>', (code: any) => `${code}.toI32Array()`],
  [/^uint32\[([0-9]+)?\]$/, 'Array<BigInt>', (code: any) => `${code}.toBigIntArray()`],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    'Array<BigInt>',
    (code: any) => `${code}.toBigIntArray()`,
  ],
  [/^string\[([0-9]+)?\]$/, 'Array<string>', (code: any) => `${code}.toStringArray()`],

  // Tuples

  ['tuple', 'ethereum.Tuple', (code: any) => `${code}.toTuple()`],
  [
    /^tuple\[([0-9]+)?\]$/,
    'Array<ethereum.Tuple>',
    (code: any, type: any) => `${code}.toTupleArray<${type}>()`,
  ],

  // Multi dimensional arrays

  [
    /^address\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<Address>>',
    (code: any) => `${code}.toAddressMatrix()`,
  ],
  [
    /^bool\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<boolean>>',
    (code: any) => `${code}.toBooleanMatrix()`,
  ],
  [
    /^byte\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<Bytes>>',
    (code: any) => `${code}.toBytesMatrix()`,
  ],
  [
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)?\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<Bytes>>',
    (code: any) => `${code}.toBytesMatrix()`,
  ],
  [
    /^int(8|16|24|32)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<i32>>',
    (code: any) => `${code}.toI32Matrix()`,
  ],
  [
    /^uint(8|16|24)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<i32>>',
    (code: any) => `${code}.toI32Matrix()`,
  ],
  [
    /^uint32\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<BigInt>>',
    (code: any) => `${code}.toBigIntMatrix()`,
  ],
  [
    /^u?int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<BigInt>>',
    (code: any) => `${code}.toBigIntMatrix()`,
  ],
  [
    /^string\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<string>>',
    (code: any) => `${code}.toStringMatrix()`,
  ],
  [
    /^tuple\[([0-9]+)?\]\[([0-9]+)?\]$/,
    'Array<Array<ethereum.Tuple>>',
    (code: any, type: any) => `${code}.toTupleMatrix<${type}>()`,
  ],
];

/**
 * AssemblyScript -> ethereum.Value conversions
 *
 * Note: The order and patterns for conversions in this direction differ slightly
 * from ethereum.Value -> AssemblyScript, which is why there is a separate table
 * for them.
 */
const ASSEMBLYSCRIPT_TO_ETHEREUM_VALUE = [
  // Scalar values

  ['Address', 'address', (code: any) => `ethereum.Value.fromAddress(${code})`],
  ['boolean', 'bool', (code: any) => `ethereum.Value.fromBoolean(${code})`],
  ['Bytes', 'byte', (code: any) => `ethereum.Value.fromFixedBytes(${code})`],
  ['Bytes', 'bytes', (code: any) => `ethereum.Value.fromBytes(${code})`],
  [
    'Bytes',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)$/,
    (code: any) => `ethereum.Value.fromFixedBytes(${code})`,
  ],
  ['i32', /^int(8|16|24|32)$/, (code: any) => `ethereum.Value.fromI32(${code})`],
  [
    'i32',
    /^uint(8|16|24)$/,
    (code: any) => `ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(${code}))`,
  ],
  [
    'BigInt',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    (code: any) => `ethereum.Value.fromSignedBigInt(${code})`,
  ],
  [
    'BigInt',
    /^uint(32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/,
    (code: any) => `ethereum.Value.fromUnsignedBigInt(${code})`,
  ],
  ['string', 'string', (code: any) => `ethereum.Value.fromString(${code})`],

  // Arrays

  [
    'Array<Address>',
    /^address\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromAddressArray(${code})`,
  ],
  [
    'Array<boolean>',
    /^bool\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromBooleanArray(${code})`,
  ],
  [
    'Array<Bytes>',
    /^byte\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromFixedBytesArray(${code})`,
  ],
  ['Array<Bytes>', /bytes\[([0-9]+)?\]$/, (code: any) => `ethereum.Value.fromBytesArray(${code})`],
  [
    'Array<Bytes>',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromFixedBytesArray(${code})`,
  ],
  [
    'Array<i32>',
    /^int(8|16|24|32)\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromI32Array(${code})`,
  ],
  [
    'Array<i32>',
    /^uint(8|16|24)\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromI32Array(${code})`,
  ],
  [
    'Array<BigInt>',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromSignedBigIntArray(${code})`,
  ],
  [
    'Array<BigInt>',
    /^uint(32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromUnsignedBigIntArray(${code})`,
  ],
  [
    'Array<string>',
    /^string\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromStringArray(${code})`,
  ],

  // Tuples

  ['ethereum.Tuple', 'tuple', (code: any) => `ethereum.Value.fromTuple(${code})`],
  [
    'Array<ethereum.Tuple>',
    /^tuple\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromTupleArray(${code})`,
  ],

  // Multi dimensional arrays

  [
    'Array<Array<Address>>',
    /^address\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromAddressMatrix(${code})`,
  ],
  [
    'Array<Array<boolean>>',
    /^bool\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromBooleanMatrix(${code})`,
  ],
  [
    'Array<Array<Bytes>>',
    /^byte\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromFixedBytesMatrix(${code})`,
  ],
  [
    'Array<Array<Bytes>>',
    /bytes\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromBytesMatrix(${code})`,
  ],
  [
    'Array<Array<Bytes>>',
    /^bytes(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromFixedBytesMatrix(${code})`,
  ],
  [
    'Array<Array<i32>>',
    /^int(8|16|24|32)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromI32Matrix(${code})`,
  ],
  [
    'Array<Array<i32>>',
    /^uint(8|16|24)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromI32Matrix(${code})`,
  ],
  [
    'Array<Array<BigInt>>',
    /^int(40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromSignedBigIntMatrix(${code})`,
  ],
  [
    'Array<Array<BigInt>>',
    /^uint(32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromUnsignedBigIntMatrix(${code})`,
  ],
  [
    'Array<Array<string>>',
    /^string\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromStringMatrix(${code})`,
  ],
  [
    'Array<Array<ethereum.Tuple>>',
    /^tuple\[([0-9]+)?\]\[([0-9]+)?\]$/,
    (code: any) => `ethereum.Value.fromTupleMatrix(${code})`,
  ],
];

/**
 * Value -> AssemblyScript conversions
 */
const VALUE_TO_ASSEMBLYSCRIPT = [
  // Arrays

  ['[Bytes]', 'Array<Bytes>', (code: any) => `${code}.toBytesArray()`],
  ['[Boolean]', 'Array<boolean>', (code: any) => `${code}.toBooleanArray()`],
  ['[Int]', 'Array<i32>', (code: any) => `${code}.toI32Array()`],
  ['[Int8]', 'Array<i64>', (code: any) => `${code}.toI64Array()`],
  ['[BigInt]', 'Array<BigInt>', (code: any) => `${code}.toBigIntArray()`],
  ['[ID]', 'Array<string>', (code: any) => `${code}.toStringArray()`],
  ['[String]', 'Array<string>', (code: any) => `${code}.toStringArray()`],
  ['[BigDecimal]', 'Array<BigDecimal>', (code: any) => `${code}.toBigDecimalArray()`],
  [/\[.*\]/, 'Array<string>', (code: any) => `${code}.toStringArray()`],

  // Scalar values

  ['Bytes', 'Bytes', (code: any) => `${code}.toBytes()`],
  ['Boolean', 'boolean', (code: any) => `${code}.toBoolean()`],
  ['Int', 'i32', (code: any) => `${code}.toI32()`],
  ['Int8', 'i64', (code: any) => `${code}.toI64()`],
  ['BigInt', 'BigInt', (code: any) => `${code}.toBigInt()`],
  ['ID', 'string', (code: any) => `${code}.toString()`],
  ['String', 'string', (code: any) => `${code}.toString()`],
  ['BigDecimal', 'BigDecimal', (code: any) => `${code}.toBigDecimal()`],
  [/.*/, 'string', (code: any) => `${code}.toString()`],
];

/**
 * AssemblyScript -> Value conversions
 *
 * Note: The order and patterns for conversions in this direction differ slightly
 * from Value -> AssemblyScript, which is why there is a separate table
 * for them.
 */
const ASSEMBLYSCRIPT_TO_VALUE = [
  // Matrices

  ['Array<Array<Address>>', '[[Bytes]]', (code: any) => `Value.fromBytesMatrix(${code})`],
  ['Array<Array<Bytes>>', '[[Bytes]]', (code: any) => `Value.fromBytesMatrix(${code})`],
  ['Array<Array<boolean>>', '[[Boolean]]', (code: any) => `Value.fromBooleanMatrix(${code})`],
  ['Array<Array<i32>>', '[[Int]]', (code: any) => `Value.fromI32Matrix(${code})`],
  ['Array<Array<i64>>', '[[Int8]]', (code: any) => `Value.fromI64Matrix(${code})`],
  ['Array<Array<BigInt>>', '[[BigInt]]', (code: any) => `Value.fromBigIntMatrix(${code})`],
  ['Array<Array<string>>', '[[String]]', (code: any) => `Value.fromStringMatrix(${code})`],
  ['Array<Array<string>>', '[[ID]]', (code: any) => `Value.fromStringMatrix(${code})`],
  [
    'Array<Array<BigDecimal>>',
    '[[BigDecimal]]',
    (code: any) => `Value.fromBigDecimalMatrix(${code})`,
  ],
  ['Array<Array<string>>', /\[\[.*\]\]/, (code: any) => `Value.fromStringMatrix(${code})`],
  ['Array<Array<string | null>>', null, (code: any) => `Value.fromStringMatrix(${code})`], // is this overwriting the Array null below?
  ['Array<ethereum.Tuple>', '[Bytes]', (code: any) => `Value.fromBytesArray(${code})`],
  // Arrays

  ['Array<Address>', '[Bytes]', (code: any) => `Value.fromBytesArray(${code})`],
  ['Array<Bytes>', '[Bytes]', (code: any) => `Value.fromBytesArray(${code})`],
  ['Array<boolean>', '[Boolean]', (code: any) => `Value.fromBooleanArray(${code})`],
  ['Array<i32>', '[Int]', (code: any) => `Value.fromI32Array(${code})`],
  ['Array<i64>', '[Int8]', (code: any) => `Value.fromI64Array(${code})`],
  ['Array<BigInt>', '[BigInt]', (code: any) => `Value.fromBigIntArray(${code})`],
  ['Array<string>', '[String]', (code: any) => `Value.fromStringArray(${code})`],
  ['Array<string>', '[ID]', (code: any) => `Value.fromStringArray(${code})`],
  ['Array<BigDecimal>', '[BigDecimal]', (code: any) => `Value.fromBigDecimalArray(${code})`],
  ['Array<string>', /\[.*\]/, (code: any) => `Value.fromStringArray(${code})`],
  ['Array<string | null>', null, (code: any) => `Value.fromStringArray(${code})`],

  // Scalar values

  ['Address', 'Bytes', (code: any) => `Value.fromBytes(${code})`],
  ['Bytes', 'Bytes', (code: any) => `Value.fromBytes(${code})`],
  ['boolean', 'Boolean', (code: any) => `Value.fromBoolean(${code})`],
  ['i32', 'Int', (code: any) => `Value.fromI32(${code})`],
  ['i64', 'Int8', (code: any) => `Value.fromI64(${code})`],
  ['BigInt', 'BigInt', (code: any) => `Value.fromBigInt(${code})`],
  ['string', 'String', (code: any) => `Value.fromString(${code})`],
  ['string', 'ID', (code: any) => `Value.fromString(${code})`],
  ['BigDecimal', 'BigDecimal', (code: any) => `Value.fromBigDecimal(${code})`],
  ['string', /.*/, (code: any) => `Value.fromString(${code})`],
];

const CONVERSIONS = {
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
} as const;

/**
 * Type conversions
 */
export default immutable.fromJS(CONVERSIONS);
