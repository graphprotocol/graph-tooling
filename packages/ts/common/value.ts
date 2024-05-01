import { Bytes, TypedMap } from './collections';
import { json } from './json';
import { Address, BigDecimal, BigInt } from './numbers';

/**
 * Enum for supported value types.
 */
export enum ValueKind {
  STRING = 0,
  INT = 1,
  BIGDECIMAL = 2,
  BOOL = 3,
  ARRAY = 4,
  NULL = 5,
  BYTES = 6,
  BIGINT = 7,
  INT8 = 8,
  TIMESTAMP = 9,
}

const VALUE_KIND_NAMES = [
  'String',
  'Int',
  'BigDecimal',
  'bool',
  'Array',
  'null',
  'Bytes',
  'BigInt',
  'Int8',
  'Timestamp',
];

/**
 * Pointer type for Value data.
 *
 * Big enough to fit any pointer or native `this.data`.
 */
export type ValuePayload = u64;

/**
 * A dynamically typed value.
 */
export class Value {
  constructor(
    public kind: ValueKind,
    public data: ValuePayload,
  ) {}

  toAddress(): Address {
    assert(this.kind == ValueKind.BYTES, 'Value is not an address.');
    return changetype<Address>(this.data as u32);
  }

  toBoolean(): boolean {
    if (this.kind == ValueKind.NULL) {
      return false;
    }
    assert(this.kind == ValueKind.BOOL, 'Value is not a boolean.');
    return this.data != 0;
  }

  toBytes(): Bytes {
    assert(this.kind == ValueKind.BYTES, 'Value is not a byte array.');
    return changetype<Bytes>(this.data as u32);
  }

  toI32(): i32 {
    if (this.kind == ValueKind.NULL) {
      return 0;
    }
    assert(this.kind == ValueKind.INT, 'Value is not an i32.');
    return this.data as i32;
  }

  toI64(): i64 {
    if (this.kind == ValueKind.NULL) {
      return 0;
    }
    assert(this.kind == ValueKind.INT8, 'Value is not an i64.');
    return this.data as i64;
  }

  toTimestamp(): i64 {
    if (this.kind == ValueKind.NULL) {
      return 0;
    }
    assert(this.kind == ValueKind.TIMESTAMP, 'Value is not an i64.');
    return this.data as i64;
  }

  toString(): string {
    assert(this.kind == ValueKind.STRING, 'Value is not a string.');
    return changetype<string>(this.data as u32);
  }

  toBigInt(): BigInt {
    assert(this.kind == ValueKind.BIGINT, 'Value is not a BigInt.');
    return changetype<BigInt>(this.data as u32);
  }

  toBigDecimal(): BigDecimal {
    assert(this.kind == ValueKind.BIGDECIMAL, 'Value is not a BigDecimal.');
    return changetype<BigDecimal>(this.data as u32);
  }

  toArray(): Array<Value> {
    assert(this.kind == ValueKind.ARRAY, 'Value is not an array.');
    return changetype<Array<Value>>(this.data as u32);
  }

  toMatrix(): Array<Array<Value>> {
    const valueArray = this.toArray();
    const out = new Array<Array<Value>>(valueArray.length);
    for (let i: i32 = 0; i < valueArray.length; i++) {
      out[i] = valueArray[i].toArray();
    }
    return out;
  }

  toBooleanArray(): Array<boolean> {
    const values = this.toArray();
    const output = new Array<boolean>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toBoolean();
    }
    return output;
  }

  toBytesArray(): Array<Bytes> {
    const values = this.toArray();
    const output = new Array<Bytes>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toBytes();
    }
    return output;
  }

  toStringArray(): Array<string> {
    const values = this.toArray();
    const output = new Array<string>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toString();
    }
    return output;
  }

  toI32Array(): Array<i32> {
    const values = this.toArray();
    const output = new Array<i32>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toI32();
    }
    return output;
  }

  toI64Array(): Array<i64> {
    const values = this.toArray();
    const output = new Array<i64>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toI32();
    }
    return output;
  }

  toTimestampArray(): Array<i64> {
    const values = this.toArray();
    const output = new Array<i64>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toTimestamp();
    }
    return output;
  }

  toBigIntArray(): Array<BigInt> {
    const values = this.toArray();
    const output = new Array<BigInt>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toBigInt();
    }
    return output;
  }

  toBigDecimalArray(): Array<BigDecimal> {
    const values = this.toArray();
    const output = new Array<BigDecimal>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      output[i] = values[i].toBigDecimal();
    }
    return output;
  }

  toBooleanMatrix(): Array<Array<boolean>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<boolean>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<boolean>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toBoolean();
      }
    }
    return out;
  }

  toBytesMatrix(): Array<Array<Bytes>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<Bytes>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<Bytes>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toBytes();
      }
    }
    return out;
  }

  toAddressMatrix(): Array<Array<Address>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<Address>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<Address>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toAddress();
      }
    }
    return out;
  }

  toStringMatrix(): Array<Array<string>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<string>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<string>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toString();
      }
    }
    return out;
  }

  toI32Matrix(): Array<Array<i32>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<i32>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<i32>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toI32();
      }
    }
    return out;
  }

  toI64Matrix(): Array<Array<i64>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<i64>>(valueMatrix.length);

    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<i64>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toI64();
      }
    }
    return out;
  }

  toBigIntMatrix(): Array<Array<BigInt>> {
    const valueMatrix = this.toMatrix();
    const out = new Array<Array<BigInt>>(valueMatrix.length);
    for (let i: i32 = 0; i < valueMatrix.length; i++) {
      out[i] = new Array<BigInt>(valueMatrix[i].length);
      for (let j: i32 = 0; j < valueMatrix[i].length; j++) {
        out[i][j] = valueMatrix[i][j].toBigInt();
      }
    }
    return out;
  }

  /** Return a string that indicates the kind of value `this` contains for
   * logging and error messages */
  displayKind(): string {
    if (this.kind >= VALUE_KIND_NAMES.length) {
      return `Unknown (${this.kind})`;
    }
    return VALUE_KIND_NAMES[this.kind];
  }

  /** Return a string representation of the value of `this` for logging and
   * error messages */
  displayData(): string {
    switch (this.kind) {
      case ValueKind.STRING:
        return this.toString();
      case ValueKind.INT:
        return this.toI32().toString();
      case ValueKind.INT8:
      case ValueKind.TIMESTAMP:
        return this.toI64().toString();
      case ValueKind.BIGDECIMAL:
        return this.toBigDecimal().toString();
      case ValueKind.BOOL:
        return this.toBoolean().toString();
      case ValueKind.ARRAY:
        // TODO: we need to clean it up. Not sure how `this` works in AssemblyScript so leaving as it is for now
        // eslint-disable-next-line no-case-declarations
        const arr = this.toArray();
        return '[' + arr.map<string>(elt => elt.displayData()).join(', ') + ']';
      case ValueKind.NULL:
        return 'null';
      case ValueKind.BYTES:
        return this.toBytes().toHexString();
      case ValueKind.BIGINT:
        return this.toBigInt().toString();
      default:
        return `Unknown data (kind = ${this.kind})`;
    }
  }

  static fromBooleanArray(input: Array<boolean>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromBoolean(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromBytesArray(input: Array<Bytes>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromBytes(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromI32Array(input: Array<i32>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromI32(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromBigIntArray(input: Array<BigInt>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromBigInt(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromBigDecimalArray(input: Array<BigDecimal>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromBigDecimal(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromStringArray(input: Array<string>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromString(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromAddressArray(input: Array<Address>): Value {
    const output = new Array<Value>(input.length);
    for (let i: i32 = 0; i < input.length; i++) {
      output[i] = Value.fromAddress(input[i]);
    }
    return Value.fromArray(output);
  }

  static fromArray(input: Array<Value>): Value {
    return new Value(ValueKind.ARRAY, changetype<u32>(input));
  }

  static fromBigInt(n: BigInt): Value {
    return new Value(ValueKind.BIGINT, changetype<u32>(n));
  }

  static fromBoolean(b: bool): Value {
    return new Value(ValueKind.BOOL, b ? 1 : 0);
  }

  static fromBytes(bytes: Bytes): Value {
    return new Value(ValueKind.BYTES, changetype<u32>(bytes));
  }

  static fromNull(): Value {
    return new Value(ValueKind.NULL, 0);
  }

  static fromI32(n: i32): Value {
    return new Value(ValueKind.INT, n as u64);
  }

  static fromI64(n: i64): Value {
    return new Value(ValueKind.INT8, n as i64);
  }

  static fromTimestamp(n: i64): Value {
    return new Value(ValueKind.TIMESTAMP, n as i64);
  }

  static fromString(s: string): Value {
    return new Value(ValueKind.STRING, changetype<u32>(s));
  }

  static fromAddress(s: Address): Value {
    return new Value(ValueKind.BYTES, changetype<u32>(s));
  }

  static fromBigDecimal(n: BigDecimal): Value {
    return new Value(ValueKind.BIGDECIMAL, changetype<u32>(n));
  }

  static fromMatrix(values: Array<Array<Value>>): Value {
    const innerOut = new Array<Value>(values.length);
    for (let i: i32 = 0; i < innerOut.length; i++) {
      innerOut[i] = Value.fromArray(values[i]);
    }
    return Value.fromArray(innerOut);
  }

  static fromBooleanMatrix(values: Array<Array<boolean>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromBoolean(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromBytesMatrix(values: Array<Array<Bytes>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromBytes(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromAddressMatrix(values: Array<Array<Address>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromAddress(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromStringMatrix(values: Array<Array<string>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromString(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromI32Matrix(values: Array<Array<i32>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromI32(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromI64Matrix(values: Array<Array<i64>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromI64(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromTimestampMatrix(values: Array<Array<i64>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromTimestamp(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }

  static fromBigIntMatrix(values: Array<Array<BigInt>>): Value {
    const out = new Array<Array<Value>>(values.length);
    for (let i: i32 = 0; i < values.length; i++) {
      out[i] = new Array<Value>(values[i].length);
      for (let j: i32 = 0; j < values[i].length; j++) {
        out[i][j] = Value.fromBigInt(values[i][j]);
      }
    }
    return Value.fromMatrix(out);
  }
}

/** Type hint for JSON values. */
export enum JSONValueKind {
  NULL = 0,
  BOOL = 1,
  NUMBER = 2,
  STRING = 3,
  ARRAY = 4,
  OBJECT = 5,
}

/**
 * Pointer type for JSONValue data.
 *
 * Big enough to fit any pointer or native `this.data`.
 */
export type JSONValuePayload = u64;

export class JSONValue {
  kind: JSONValueKind;
  data: JSONValuePayload;

  isNull(): boolean {
    return this.kind == JSONValueKind.NULL;
  }

  toBool(): boolean {
    assert(this.kind == JSONValueKind.BOOL, 'JSON value is not a boolean.');
    return this.data != 0;
  }

  toI64(): i64 {
    assert(this.kind == JSONValueKind.NUMBER, 'JSON value is not a number.');
    const decimalString = changetype<string>(this.data as u32);
    return json.toI64(decimalString);
  }

  toU64(): u64 {
    assert(this.kind == JSONValueKind.NUMBER, 'JSON value is not a number.');
    const decimalString = changetype<string>(this.data as u32);
    return json.toU64(decimalString);
  }

  toF64(): f64 {
    assert(this.kind == JSONValueKind.NUMBER, 'JSON value is not a number.');
    const decimalString = changetype<string>(this.data as u32);
    return json.toF64(decimalString);
  }

  toBigInt(): BigInt {
    assert(this.kind == JSONValueKind.NUMBER, 'JSON value is not a number.');
    const decimalString = changetype<string>(this.data as u32);
    return json.toBigInt(decimalString);
  }

  toString(): string {
    assert(this.kind == JSONValueKind.STRING, 'JSON value is not a string.');
    return changetype<string>(this.data as u32);
  }

  toArray(): Array<JSONValue> {
    assert(this.kind == JSONValueKind.ARRAY, 'JSON value is not an array.');
    return changetype<Array<JSONValue>>(this.data as u32);
  }

  toObject(): TypedMap<string, JSONValue> {
    assert(this.kind == JSONValueKind.OBJECT, 'JSON value is not an object.');
    return changetype<TypedMap<string, JSONValue>>(this.data as u32);
  }
}
